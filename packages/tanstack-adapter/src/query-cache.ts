import { Environment, ReplaySubject, type OperationDescriptor } from 'relay-runtime';
import { buildQueryKey, RelayQuery } from './query.ts';
import { createBackpressuredCallback } from './stream-utils.ts';
import type { QueryEvent, QueryProgressEvent, ReadableStreamRelayEvent } from './transport.ts';

export const createQueryCache = (isServer?: boolean) => {
  return new QueryCache(isServer);
};

export class QueryCache {
  private _isServer: boolean;
  // server side subscription to requests
  watchQueryQueue = createBackpressuredCallback<{
    event: Extract<QueryEvent, { type: 'started' }>;
    replaySubject: ReplaySubject<QueryProgressEvent>;
  }>();
  // client side map of consumed queries
  private simulatedStreamingQueries = new Map<
    string,
    {
      operation: OperationDescriptor;
      replaySubject: ReplaySubject<ReadableStreamRelayEvent>;
    }
  >();

  queries: Map<string, RelayQuery>;

  constructor(isServer?: boolean) {
    this._isServer = isServer ?? false;
    this.queries = new Map<string, RelayQuery>();
  }

  build(operation: OperationDescriptor): RelayQuery {
    const queryId = buildQueryKey(operation);

    let query = this.get(queryId);

    if (!query) {
      query = new RelayQuery(operation);
      this.add(query);
    }
    return query;
  }

  add(query: RelayQuery): void {
    if (!this.queries.has(query.queryKey)) {
      this.queries.set(query.queryKey, query);
    }
  }

  get(queryId: string): RelayQuery | undefined {
    return this.queries.get(queryId);
  }

  onQueryStarted(event: Extract<QueryEvent, { type: 'started' }>): void {
    const query = this.build(event.operation);
    this.simulatedStreamingQueries.set(event.id, {
      operation: query.getOperation(),
      replaySubject: query.replaySubject,
    });
  }

  onQueryProgress(event: QueryProgressEvent) {
    const query = this.simulatedStreamingQueries.get(event.id);
    if (!query?.replaySubject) {
      throw new Error(`ReplaySubject for query with id ${event.id} not found`);
    }
    switch (event.type) {
      case 'next':
        query.replaySubject.next(event);
        break;
      case 'error':
        this.simulatedStreamingQueries.delete(event.id);
        query.replaySubject.error(new Error(JSON.stringify(event.error)));
        break;
      case 'complete':
        this.simulatedStreamingQueries.delete(event.id);
        query.replaySubject.complete();
        break;
    }
  }

  /**
   * Can be called when the stream closed unexpectedly while there might still be unresolved
   * simulated server-side queries going on.
   * Those queries will be cancelled and then re-run in the browser.
   */
  rerunSimulatedQueries = (environment: Environment) => {
    for (const [id, query] of this.simulatedStreamingQueries) {
      this.simulatedStreamingQueries.delete(id);
      // oxlint-disable-next-line no-console
      console.log(
        'Streaming connection closed before server query could be fully transported, rerunning:',
        query.operation.request,
      );

      return environment.execute({ operation: query.operation });
    }
  };

  watchQuery(operation: OperationDescriptor, replaySubject: ReplaySubject<QueryProgressEvent>) {
    if (!this._isServer) {
      throw new Error('watchQuery is not supported on the client');
    }

    if (!this.watchQueryQueue) {
      throw new Error('watchQueryQueue is not initialized');
    }

    const id = buildQueryKey(operation);

    this.watchQueryQueue.push({
      event: {
        id,
        type: 'started',
        operation,
      },
      replaySubject,
    });
  }
}

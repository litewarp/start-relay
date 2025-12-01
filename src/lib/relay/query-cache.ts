import type {
  CacheConfig,
  GraphQLResponse,
  RequestParameters,
  UploadableMap,
  Variables,
} from 'relay-runtime';
import { buildQueryId, RelayQuery } from './relay-query.ts';
import { Subscribable } from './subscribable.ts';

// biome-ignore lint/complexity/noBannedTypes: hack
export type Register = {};

export type DefaultError = Register extends {
  defaultError: infer TError;
}
  ? TError
  : Error;

export type NotifyEventType = 'added' | 'data' | 'error' | 'complete';

export interface NotifyEvent {
  type: NotifyEventType;
}
interface NotifyEventQueryAdded extends NotifyEvent {
  type: 'added';
  query: RelayQuery;
}

interface NotifyEventQueryData extends NotifyEvent {
  type: 'data';
  query: RelayQuery;
  data: GraphQLResponse[];
}

interface NotifyEventQueryError extends NotifyEvent {
  type: 'error';
  query: RelayQuery;
  error: DefaultError;
}

interface NotifyEventQueryComplete extends NotifyEvent {
  type: 'complete';
  query: RelayQuery;
}

export type QueryCacheNotifyEvent =
  | NotifyEventQueryAdded
  | NotifyEventQueryData
  | NotifyEventQueryError
  | NotifyEventQueryComplete;

type DispatchFn = (event: QueryCacheNotifyEvent) => void;

export interface QueryStore {
  has: (queryId: string) => boolean;
  set: (queryId: string, query: RelayQuery) => void;
  get: (queryId: string) => RelayQuery | undefined;
  delete: (queryId: string) => void;
  values: () => IterableIterator<RelayQuery>;
}

export class QueryCache extends Subscribable<DispatchFn> {
  queries: QueryStore;
  serverStreamingQueries: Set<string>;
  _onStreamingEnd: () => void;

  constructor() {
    super();
    this.queries = new Map<string, RelayQuery>();
    this.serverStreamingQueries = new Set<string>();
    this._onStreamingEnd = () => {};
  }

  notify(event: QueryCacheNotifyEvent): void {
    const query = this.queries.get(event.query.queryId);
    if (!query) {
      throw new Error(`Query with ID ${event.query.queryId} not found`);
    }
    switch (event.type) {
      case 'added':
        this.serverStreamingQueries.add(event.query.queryId);
        query.startStream();
        break;
      case 'data':
        // no op
        // consider replaying server side?
        break;
      case 'error':
        this.serverStreamingQueries.delete(event.query.queryId);
        query.error(event.error);
        break;
      case 'complete':
        query.complete();
        this.serverStreamingQueries.delete(event.query.queryId);
        break;
    }

    this.listeners.forEach((listener) => {
      listener(event);
    });

    // if serverStreamingQueries is empty
    // run complete cb
    if (this.serverStreamingQueries.size === 0) {
      this._onStreamingEnd();
    }
  }

  build(
    request: RequestParameters,
    variables: Variables,
    cacheConfig: CacheConfig,
    uploadables?: UploadableMap | null,
  ): RelayQuery {
    const queryId = buildQueryId(request, variables);
    let query = this.get(queryId);

    if (!query) {
      query = new RelayQuery({ request, variables, cacheConfig, uploadables });
      this.add(query);
    }
    return query;
  }

  add(query: RelayQuery): void {
    if (!this.queries.has(query.queryId)) {
      this.queries.set(query.queryId, query);
    }
  }

  get(queryId: string): RelayQuery | undefined {
    return this.queries.get(queryId);
  }

  onStreamingEnd(cb: () => void): void {
    this._onStreamingEnd = cb;
  }
}

import { multipartFetch } from './fetch-multipart/index.ts';
import type { QueryCache } from './query-cache.ts';
import { queryKeyFromIdAndVariables } from './query.ts';
import { RelayIncrementalDeliveryTransformer } from './transformer.ts';

import type {
  InitialIncrementalExecutionResult,
  SubsequentIncrementalExecutionResult,
} from 'graphql';
import runtime, {
  type ExecuteFunction,
  type FetchFunction,
  type GraphQLResponse,
} from 'relay-runtime';

const { Network, Observable } = runtime;

interface RelayReplayNetworkConfig {
  url: string;
  fetchOpts: RequestInit;
  queryCache: QueryCache;
  isServer: boolean;
}

export class RelayReplayNetwork {
  public execute: ExecuteFunction;
  public queryCache: QueryCache;

  private _url: string;
  private _fetchOpts: RequestInit;
  private _fetchFn: FetchFunction;
  private _isServer: boolean;

  constructor(config: RelayReplayNetworkConfig) {
    const { url, fetchOpts, queryCache, isServer } = config;
    this._url = url;
    this._fetchOpts = fetchOpts;
    this._isServer = isServer;
    this.queryCache = queryCache;

    this._fetchFn = (request, variables, _cacheConfig, _uploadables) => {
      // console.log(`starting fetch ${typeof window === "undefined" ? "in server" : "in browser"}`);
      // const forceFetch = cacheConfig?.force ?? false;

      const requestInit = {
        method: this._fetchOpts.method ?? 'POST',
        headers: {
          'content-type': 'application/mixe',
          ...this._fetchOpts.headers,
        },
        body: JSON.stringify({
          id: request.id,
          query: request.text,
          variables,
        }),
        credentials: this._fetchOpts.credentials,
        // signal: this._isServer ? undefined : signal,
      };

      // const signal =
      //   cacheConfig?.metadata?.signal && cacheConfig?.metadata?.signal instanceof AbortSignal
      //     ? cacheConfig.metadata.signal
      //     : undefined;
      //
      const queryKey = queryKeyFromIdAndVariables(request.id ?? request.cacheID, variables);

      // on the server, pass the response to the replaysubject
      if (this._isServer) {
        const query = this.queryCache.get(queryKey);
        if (!query) {
          throw new Error(`Query not found in cache`);
        }
        const replaySubject = query.replaySubject;

        this.queryCache.watchQuery(query.getOperation(), replaySubject);

        const transformer = new RelayIncrementalDeliveryTransformer((...args) => {
          for (const arg of args) {
            replaySubject.next({ type: 'next', id: query.queryKey, data: arg });
          }
        });

        multipartFetch<InitialIncrementalExecutionResult | SubsequentIncrementalExecutionResult>(
          this._url,
          {
            ...requestInit,
            onComplete: () => {
              replaySubject.next({ type: 'complete', id: query.queryKey });
              replaySubject.complete();
            },
            onError: (err) => {
              const error = err instanceof Error ? err.message : String(err);
              replaySubject.next({ type: 'error', id: query.queryKey, error });
              replaySubject.error(err);
            },
            onNext: (value) => {
              transformer.onNext(value);
            },
          },
        );

        return Observable.create<GraphQLResponse>((sink) => {
          replaySubject.subscribe({
            next: (value) => {
              switch (value.type) {
                case 'next':
                  sink.next(value.data);
                  break;
                case 'error':
                  sink.error(new Error(JSON.stringify(value.error)));
                  break;
                case 'complete':
                  sink.complete();
                  break;
              }
            },
            error: (error: Error) => {
              sink.error(error);
            },
            complete: () => {
              sink.complete();
            },
          });
        });
      }

      // if we are on the client, check to see if we have a cached response
      const query = this.queryCache.get(queryKey);
      if (query) {
        // console.log('returning from replay');
        return Observable.create<GraphQLResponse>((sink) => {
          return query.replaySubject.subscribe({
            next: (data) => {
              switch (data.type) {
                case 'next':
                  sink.next(data.data);
                  break;
              }
            },
            error: (err: unknown) => {
              const error = err instanceof Error ? err : new Error(`Unknown error`);
              sink.error(error);
            },
            complete: () => {
              sink.complete();
            },
          });
        });
        // otherwise fetch as normal
      } else {
        return Observable.create<GraphQLResponse>((sink) => {
          const transformer = new RelayIncrementalDeliveryTransformer((...args) => {
            for (const arg of args) {
              sink.next(arg);
            }
          });
          multipartFetch<InitialIncrementalExecutionResult | SubsequentIncrementalExecutionResult>(
            this._url,
            {
              ...requestInit,
              onComplete: () => {
                sink.complete();
              },
              onError: (error) => {
                sink.error(error);
              },
              onNext: (value) => {
                transformer.onNext(value);
              },
            },
          );
        });
      }
    };

    const network = Network.create(this._fetchFn);
    this.execute = network.execute;
  }
}

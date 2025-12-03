# Tanstack Start Relay Starter

Check out the example at `/apps/example`

The relay adapter is exported from `/packages/tanstack-adapter` which is an internal package at the moment. Will consider publishing it if there is interest.

## To Use in a Tanstack App

### 1. Create a function to initialize the Relay Environment

```ts
// src/lib/relay/environment.ts
import { Environment, RecordSource, Store } from 'relay-runtime';
import { RelayReplayNetwork, type QueryCache } from '@litewarp/tanstack-relay-adapter';

export const createEnvironment = (queryCache: QueryCache, isServer: boolean) => {
  // debug(`New environment created in ${typeof window === "undefined" ? "server" : "client"}`);
  return new Environment({
    network: new RelayReplayNetwork({
      queryCache,
      isServer,
      fetchOpts: { credentials: 'include' },
      url: 'http://localhost:3000/api/graphql',
    }),
    store: new Store(new RecordSource()),
    isServer,
  });
};
```

### 2. Wrap the Router with the `routerWithRelay` Function

```ts
// src/router.tsx
import { routerWithRelay, createQueryCache } from '@litewarp/tanstack-relay-adapter';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { createEnvironment } from '~/lib/relay/environment.ts';
import { DefaultCatchBoundary } from './components/DefaultCatchBoundary.tsx';
import { NotFound } from './components/NotFound.tsx';
import { routeTree } from './routeTree.gen.ts';

const IS_SERVER = typeof window === 'undefined';

const queryCache = createQueryCache(IS_SERVER);
const environment = createEnvironment(queryCache, IS_SERVER);

export function getRouter() {
  return routerWithRelay(
    createTanStackRouter({
      routeTree,
      defaultPreload: 'intent',
      defaultErrorComponent: DefaultCatchBoundary,
      defaultNotFoundComponent: () => <NotFound />,
      scrollRestoration: true,
      context: {
        environment: null,
        preloadQuery: null,
      },
    }),
    environment,
    queryCache,
  );
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
```

## How it works

This process is a combination of a few various approaches to preloading and hydrating a server-side relay query when a multipart (i.e., deferred or streamed) response is received. In particular, there are three approaches it borrows from:
- [@tanstack/react-router-ssr-query](https://github.com/TanStack/router/tree/main/packages/react-router-ssr-query)
- [apollographql/apollo-client-integrations](https://github.com/apollographql/apollo-client-integrations) and in particular, the `client-react-streaming` and `tanstack-start` packages
- [tobias-tengler/relay-rsc-poc](https://github.com/tobias-tengler/relay-rsc-poc)

The flow is as follows:

### 1. User makes request to page - e.g., navigating to `/defer`

### 2. The preload function is called in the app

```ts
// apps/example/src/routes/defer.tsx
export const Route = createFileRoute('/defer')({
  loader: ({ context }) => {
    return context.preloadQuery(query, {});
  },
  component: RouteComponent,
});
```

### 3. The server starts the fetch to ssr the page

It registers a replaySubject on the Server Side to watch the query

```ts
  // packages/tanstack-adapter/src/preloaded-query.ts
  
    // store the operation in the queryCache
    if (environment.isServer()) {
      queryCache.build(operation);
    }
```

And sends the `OperationDescriptor` to the client along with the PreloadedQuery

```ts
  // packages/tanstack-adapter/src/preloaded-query.ts
  
    if (environment.isServer()) {
      return {
        ...preloadedQuery,
        $__relay_queryRef: {
          operation,
        },
      };
    } else {
      return preloadedQuery;
    }
  };
```

### 4. We add a serialization adapter to remove the stateful fields and callbacks from the PreloadedQuery 

```ts
// packages/tanstack-adapter/src/hydration.ts

export function createPreloadedQuerySerializer<TQuery extends OperationType>(
  environment: Environment,
  queryCache: QueryCache,
) {
  return createSerializationAdapter<
    StreamedPreloadedQuery<TQuery>,
    DehydratedPreloadedQuery<TQuery>
  >({
    key: 'relay-ssr-preloaded-query',
    test: isStreamedPreloadedQuery,
    // @ts-expect-error tanstack-serialization
    toSerializable: (value) => {
      return dehydratePreloadedQuery(value);
    },
    fromSerializable: (value) => {
      return hydratePreloadedQuery(environment, value, queryCache);
    },
  });
}
```

Since `loadQuery` is a [synchronous call](https://github.com/facebook/relay/blob/4346fb696b69c16d89a28f7e7562698c78729df2/packages/react-relay/relay-hooks/loadQuery.js#L68), the metadata regarding the PreloadedQuery is sent immediately to the client.

### 5. The Server starts the fetch to ssr the page and registers a replay subject for each query that is run. The fetched query is then subscribed to the replaySubject which pipes the response.

```ts
// packages/tanstack-adapter/src/hydration.ts

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
```

A [ReplaySubject](https://github.com/facebook/relay/blob/main/packages/relay-runtime/util/RelayReplaySubject.js) acts like an observable with a backpressure callback. It ["[r]ecords events provided and synchronously plays them back to new subscribers, as well as forwarding new asynchronous events."](https://github.com/facebook/relay/blob/main/packages/relay-runtime/util/RelayReplaySubject.js)

### 6. For each server-called query, the ServerTransport subscribes to the replaySubject and bundles them into events to stream to the client. 

```ts
// packages/tanstack-adapter/src/transport.ts

  dispatchRequestStarted = ({
    event,
    replaySubject,
  }: {
    event: Extract<QueryEvent, { type: 'started' }>;
    replaySubject: ReplaySubject<QueryProgressEvent>;
  }): void => {
    this.controller.enqueue(event);
    this.ongoingStreams.add(event);
    const finalize = () => {
      this.ongoingStreams.delete(event);
      this.closeIfFinished();
    };
    replaySubject.subscribe({
      next: (ev) => {
        if (!this.closed) {
          this.controller.enqueue(ev);
        }
      },
      error: finalize,
      complete: finalize,
    });
  };
```

### 7. Prior to streaming, when the client immediately hydrates for the first time, the preloadedQuery metadata is hydrated and a replaySubject is created and registered so that the client knows that data is on the way and no re-fetch is needed.

```ts
// packages/tanstack-adapter/src/hydration.ts

export function hydratePreloadedQuery<TQuery extends OperationType>(
  environment: Environment,
  dehydratedQuery: DehydratedPreloadedQuery<TQuery>,
  queryCache: QueryCache,
): StreamedPreloadedQuery<TQuery> {
  let isDisposed = false;
  let isReleased = false;

  debug('hydrating query');
  // build the query on the client
  const _query = queryCache.build(dehydratedQuery.$__relay_queryRef.operation);

  return {...}
}
```

### 8. The transport SerializationAdapter isolates the stream of events on the server and serializes it to the client.

```ts
// packages/tanstack-adapter/src/transport.ts
export const transportSerializationAdapter = createSerializationAdapter<
  ServerTransport | ClientTransport,
  Transported
>({
  key: 'relay-ssr-transport',
  test: (value): value is ServerTransport => value instanceof ServerTransport,
  toSerializable(data) {
    // TS is a bit too strict about serializability here - some values are just `unknown`, but definitely serializable
    return (data as ServerTransport).stream satisfies Transported as any;
  },
  fromSerializable(data) {
    return new ClientTransport(data);
  },
});
```

### 9. When the client registers the Client Transport `onQueryEvent` callback, it registers a callback to pipe the streamed response through the replaySubject.

```ts
  // packages/tanstack-adapter/src/transport.ts

  public set onQueryEvent(cb: (event: QueryEvent) => void) {
    let event: QueryEvent | undefined;
    while ((event = this.bufferedEvents.shift())) {
      cb(event);
    }
    this.bufferedEvents.push = (...events: QueryEvent[]) => {
      for (const event of events) {
        cb(event);
      }
      return 0;
    };
  }
```

```ts
  // packages/tanstack-adapter/src/wrap-relay-provider.ts
  
  const WrappedRelayProvider = (props: WrappedRelayProviderProps<P>) => {
    const { getEnvironment, children, ...extraProps } = props;

    const { environment, queryCache } = useMemo(() => getEnvironment(), []);

    return (
      <RelayEnvironmentProvider environment={environment}>
        <TransportProvider
          onQueryEvent={(event) =>
            event.type === 'started'
              ? queryCache.onQueryStarted(event)
              : queryCache.onQueryProgress(event)
          }
          rerunSimulatedQueries={() => queryCache.rerunSimulatedQueries(environment)}
          registerDispatchRequestStarted={queryCache.watchQueryQueue?.register}
          {...(extraProps as P)}
        >
          {children}
        </TransportProvider>
      </RelayEnvironmentProvider>
    );
  };
```

```ts
  // packages/tanstack-adapter/src/wrap-relay-provider.ts
  
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
```

### 10. So when the client fetch function is called, the request is intercepted and returned with an observable watching the streamed response request instead of fetching the request anew.

```ts
  // packages/tanstack-adapter/src/network.ts
  
  // if we are on the client, check to see if we have a cached response
  const query = this.queryCache.get(queryKey);
  if (query) {
    // debug('returning from replay');
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
```

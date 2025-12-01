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
  // console.log(`New environment created in ${typeof window === "undefined" ? "server" : "client"}`);
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

import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { createEnvironment } from '~/lib/relay/environment.ts';
import { DefaultCatchBoundary } from './components/DefaultCatchBoundary.tsx';
import { NotFound } from './components/NotFound.tsx';
import { routerWithRelay, createQueryCache } from '@litewarp/tanstack-relay-adapter';
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

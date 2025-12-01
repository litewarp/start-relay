import { RecordSource, type Environment } from 'relay-runtime';
import { createPreloader } from './preloaded-query.ts';
import type { AnyRouter } from '@tanstack/react-router';
import type { QueryCache } from './query-cache.ts';
import {
  ServerTransport,
  transportSerializationAdapter,
  type ClientTransport,
} from './transport.ts';
import { createPreloadedQuerySerializer } from './hydration.ts';
import { Fragment } from 'react/jsx-runtime';
import { RelayProvider } from './relay-provider.tsx';

export interface RelayRouterContext {
  environment: Environment;
  preloadQuery: ReturnType<typeof createPreloader>;
}

export type ValidateRouter<TRouter extends AnyRouter> =
  NonNullable<TRouter['options']['context']> extends RelayRouterContext ? TRouter : never;

export function routerWithRelay<TRouter extends AnyRouter>(
  router: ValidateRouter<TRouter>,
  environment: Environment,
  queryCache: QueryCache,
): TRouter {
  const ogOptions = router.options;

  router.options.context ??= {};
  router.options.context.environment = environment;
  router.options.context.preloadQuery = createPreloader(environment, queryCache);

  const ogHydrate = router.options.hydrate;
  const ogDehydrate = router.options.dehydrate;

  const providerContext = {} as { transport: ServerTransport | ClientTransport };

  if (router.isServer) {
    const relayTransport = new ServerTransport();
    providerContext.transport = relayTransport;

    router.options.dehydrate = async () => {
      router.serverSsr!.onRenderFinished(() => relayTransport.closeOnceFinished());
      return {
        ...(await ogDehydrate?.()),
        recordSource: environment.getStore().getSource().toJSON(),
        relayTransport,
      };
    };
  } else {
    router.options.hydrate = (dehydratedState) => {
      providerContext.transport = dehydratedState.relayTransport;
      if (dehydratedState.recordSource) {
        environment.getStore().publish(new RecordSource(dehydratedState.recordSource));
      }
      return ogHydrate?.(dehydratedState);
    };
  }

  router.options.serializationAdapters = [
    ...(router.options.serializationAdapters ?? []),
    createPreloadedQuerySerializer(environment, queryCache),
    transportSerializationAdapter,
  ];

  const PreviousInnerWrap = ogOptions.InnerWrap ?? Fragment;
  router.options.InnerWrap = ({ children }) => {
    return (
      <RelayProvider environment={environment} queryCache={queryCache} context={providerContext}>
        <PreviousInnerWrap>{children}</PreviousInnerWrap>
      </RelayProvider>
    );
  };
  return router;
}

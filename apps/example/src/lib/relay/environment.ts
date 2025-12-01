import { Environment, RecordSource, Store } from 'relay-runtime';
import { RelayReplayNetwork } from '../relay-streaming/network.ts';
import type { QueryCache } from '../relay-streaming/query-cache.ts';

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

import {
  RelayReplayNetwork,
  type QueryCache,
} from "@litewarp/tanstack-relay-adapter";
import { Environment, RecordSource, Store } from "relay-runtime";

export const createEnvironment = (
  queryCache: QueryCache,
  isServer: boolean,
) => {
  return new Environment({
    network: new RelayReplayNetwork({
      queryCache,
      isServer,
      fetchOpts: { credentials: "include" },
      url: "http://localhost:3000/api/graphql",
    }),
    store: new Store(new RecordSource()),
    isServer,
  });
};

import { Environment, type EnvironmentConfig, RecordSource, Store } from "relay-runtime";
import { RelayReplayNetwork } from "./streaming/network.ts";
import type { QueryCache } from "./streaming/query-cache.ts";

export const createEnvironment = (queryCache: QueryCache) => {
	console.log(`New environment created in ${typeof window === "undefined" ? "server" : "client"}`);
	return new Environment({
	  deferDeduplicatedFields: true,
		network: new RelayReplayNetwork({
			queryCache,
			isServer: typeof window === "undefined",
			fetchOpts: { credentials: "include" },
			url: "/api/graphql",
		}),
		store: new Store(new RecordSource()),
	});
};

import { Environment, RecordSource, Store } from "relay-runtime";
import { RelayReplayNetwork } from "./network.ts";
import type { QueryCache } from "./query-cache.ts";

export const createEnvironment = (queryCache: QueryCache) => {
	// console.log(`New environment created in ${typeof window === "undefined" ? "server" : "client"}`);
	return new Environment({
		network: new RelayReplayNetwork({
			queryCache,
			isServer: typeof window === "undefined",
			fetchOpts: { credentials: "include" },
			url: "/api/graphql",
		}),
		store: new Store(new RecordSource()),
	});
};

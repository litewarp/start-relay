import { Environment, Network, RecordSource, Store } from "relay-runtime";
import { fetchFn } from "~/lib/relay/fetch-fn.ts";

export const createEnvironment = () =>
	new Environment({
		network: Network.create(fetchFn),
		store: new Store(new RecordSource()),
	});

import type { Environment, GraphQLTaggedNode } from "react-relay";
import runtime, {
	type CacheConfig,
	type OperationType,
	type RequestParameters,
	type VariablesOf,
} from "relay-runtime";
import type { RecordMap } from "relay-runtime/lib/store/RelayStoreTypes.js";

const { fetchQuery } = runtime;

export interface SerializablePreloadedQuery<TQuery extends OperationType> {
	params: RequestParameters;
	variables: VariablesOf<TQuery>;
	recordMap: RecordMap;
}

export const createPreloader = (environment: Environment) => {
	const preloadQuery = async <TQuery extends OperationType>(
		node: GraphQLTaggedNode,
		variables: VariablesOf<TQuery>,
		networkCacheConfig?: CacheConfig,
	): Promise<void> => {
		await fetchQuery<TQuery>(environment, node, variables, {
			networkCacheConfig,
		}).toPromise();
	};

	return preloadQuery;
};

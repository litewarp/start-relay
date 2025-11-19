import type { Environment, GraphQLTaggedNode } from "react-relay";
import relay from "react-relay";
import runtime, {
	type CacheConfig,
	type OperationType,
	type RequestParameters,
	type VariablesOf,
} from "relay-runtime";

const { loadQuery } = relay;
const { getRequest } = runtime;

export interface SerializablePreloadedQuery<TQuery extends OperationType> {
	params: RequestParameters;
	variables: VariablesOf<TQuery>;
	response: TQuery["response"];
}

export const createPreloader = (environment: Environment) => {
	const preloadQuery = <TQuery extends OperationType>(
		node: GraphQLTaggedNode,
		variables: VariablesOf<TQuery>,
		networkCacheConfig?: CacheConfig,
	) => {
		return loadQuery<TQuery>(environment, getRequest(node), variables, {
			fetchPolicy: "store-or-network",
			...networkCacheConfig,
		});
	};

	return preloadQuery;
};

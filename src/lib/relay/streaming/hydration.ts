import type { Environment, OperationType } from "relay-runtime";
import type { SerializablePreloadedQuery } from "./preloader.ts";
import type { QueryCache } from "./query-cache.ts";
import type { RelayQuery } from "./relay-query.ts";

export function dehydrateQuery<TQuery extends OperationType>(
	query: RelayQuery,
): Omit<SerializablePreloadedQuery<TQuery>, "response"> {
	return {
		params: query.request,
		variables: query.variables,
	};
}

export function hydrateQuery<TQuery extends OperationType>(
	serializedQuery: SerializablePreloadedQuery<TQuery>,
	environment: Environment,
): RelayQuery {
	const { params, variables } = serializedQuery;
	const network = environment.getNetwork();
	// @ts-expect-error need to override types
	const queryCache = network.queryCache as QueryCache;

	return queryCache.build(params, variables, {});
}

import type { OperationType } from "relay-runtime";
import type { SerializablePreloadedQuery } from "./preloader.ts";
import type { RelayQuery } from "./relay-query.ts";

export function dehydrateQuery<TQuery extends OperationType>(
	query: RelayQuery,
): Omit<SerializablePreloadedQuery<TQuery>, "response"> {
	return {
		params: query.request,
		variables: query.variables,
	};
}

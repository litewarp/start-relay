import relay, { type Environment, type PreloadedQuery } from "react-relay";
import type {
	GraphQLTaggedNode,
	OperationType,
	PreloadableConcreteRequest,
	VariablesOf,
} from "relay-runtime";

export const createPreloader = (environment: Environment) => {
	const preloadQuery = <TQuery extends OperationType>(
		preloadableRequest: GraphQLTaggedNode | PreloadableConcreteRequest<TQuery>,
		variables: VariablesOf<TQuery>,
		signal?: AbortSignal,
	): PreloadedQuery<TQuery, Record<string, unknown>> => {
		return relay.loadQuery(
			environment,
			preloadableRequest,
			variables,
			{
				fetchPolicy: "store-and-network",
			},
			{
				cacheConfig: {
					metadata: {
						signal,
					},
				},
			},
		);
	};
	return preloadQuery;
};

export async function preloadRelayQuery<
	TQuery extends OperationType,
	TEnv extends Environment,
>(
	environment: TEnv,
	preloadableRequest: GraphQLTaggedNode | PreloadableConcreteRequest<TQuery>,
	variables: VariablesOf<TQuery>,
	signal?: AbortSignal,
): Promise<PreloadedQuery<TQuery, Record<string, unknown>>> {
	return relay.loadQuery(
		environment,
		preloadableRequest,
		variables,
		{
			fetchPolicy: "store-and-network",
		},
		{
			cacheConfig: {
				metadata: {
					signal,
				},
			},
		},
	);
}

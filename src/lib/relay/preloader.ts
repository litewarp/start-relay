import type { Environment, GraphQLTaggedNode } from 'react-relay';
import relay from 'react-relay';
import runtime, {
  type CacheConfig,
  type GraphQLResponse,
  type OperationType,
  type RequestParameters,
  type VariablesOf,
} from 'relay-runtime';

const { loadQuery } = relay;
const { getRequest } = runtime;

export interface SerializablePreloadedQuery<TQuery extends OperationType> {
  params: RequestParameters;
  variables: VariablesOf<TQuery>;
  response: GraphQLResponse[];
}

export const createPreloader = (environment: Environment) => {
  const preloadQuery = <TQuery extends OperationType>(
    node: GraphQLTaggedNode,
    variables: VariablesOf<TQuery>,
    networkCacheConfig?: CacheConfig,
  ) => {
    return loadQuery<TQuery>(environment, getRequest(node), variables, {
      networkCacheConfig,
    });
  };

  return preloadQuery;
};

import type {
  EnvironmentProviderOptions,
  LoadQueryOptions,
  OperationDescriptor,
  PreloadedQuery,
} from 'react-relay';
import runtime, {
  type Environment,
  type GraphQLTaggedNode,
  type OperationType,
  type VariablesOf,
} from 'relay-runtime';
import relay from 'react-relay';
import type { QueryCache } from './query-cache.ts';

const { getRequest, createOperationDescriptor } = runtime;

export interface StreamedPreloadedQuery<TQuery extends OperationType>
  extends PreloadedQuery<TQuery> {
  $__relay_queryRef: {
    operation: OperationDescriptor;
  };
}

export type PreloaderFunction = <TQuery extends OperationType>(
  request: GraphQLTaggedNode,
  variables: VariablesOf<TQuery>,
  options?: LoadQueryOptions,
  environmentProviderOptions?: EnvironmentProviderOptions,
) => PreloadedQuery<OperationType> | StreamedPreloadedQuery<OperationType>;

export const createPreloader = <TQuery extends OperationType>(
  environment: Environment,
  queryCache: QueryCache,
): PreloaderFunction => {
  return (
    request: GraphQLTaggedNode,
    variables: VariablesOf<TQuery>,
    options?: LoadQueryOptions,
    environmentProviderOptions?: EnvironmentProviderOptions,
  ) => {
    const req = getRequest(request);
    const operation = createOperationDescriptor(req, variables, options?.networkCacheConfig);

    // store the operation in the queryCache
    if (environment.isServer()) {
      queryCache.build(operation);
    }

    const preloadedQuery = relay.loadQuery<TQuery>(
      environment,
      request,
      variables,
      options,
      environmentProviderOptions,
    );

    if (environment.isServer()) {
      return {
        ...preloadedQuery,
        $__relay_queryRef: {
          operation,
        },
      };
    } else {
      return preloadedQuery;
    }
  };
};

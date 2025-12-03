import type { StreamedPreloadedQuery } from "./preloaded-query.ts";
import { QueryCache } from "./query-cache.ts";

import { createSerializationAdapter } from "@tanstack/react-router";
import { type Environment, type OperationType } from "relay-runtime";

import { debug } from "./debug.ts";

const dehydratedOmittedKeys = new Set([
  "dispose",
  "environment",
  "isDisposed",
  "networkError",
  "releaseQuery",
  "source",
]);

export type DehydratedPreloadedQuery<TQuery extends OperationType> = Omit<
  StreamedPreloadedQuery<TQuery>,
  | "dispose"
  | "environment"
  | "isDisposed"
  | "networkError"
  | "releaseQuery"
  | "source"
>;

const isStreamedPreloadedQuery = <TQuery extends OperationType>(
  value: unknown,
): value is StreamedPreloadedQuery<TQuery> => {
  return (
    value !== null &&
    typeof value === "object" &&
    Object.keys(value).some((key) => dehydratedOmittedKeys.has(key))
  );
};

export function dehydratePreloadedQuery<TQuery extends OperationType>(
  preloadedQuery: StreamedPreloadedQuery<TQuery>,
): DehydratedPreloadedQuery<TQuery> {
  return {
    kind: preloadedQuery.kind,
    environmentProviderOptions: preloadedQuery.environmentProviderOptions,
    fetchKey: preloadedQuery.fetchKey,
    fetchPolicy: preloadedQuery.fetchPolicy,
    networkCacheConfig: preloadedQuery.networkCacheConfig,
    id: preloadedQuery.id,
    name: preloadedQuery.name,
    variables: preloadedQuery.variables,
    $__relay_queryRef: {
      operation: preloadedQuery.$__relay_queryRef.operation,
    },
  };
}

export function hydratePreloadedQuery<TQuery extends OperationType>(
  environment: Environment,
  dehydratedQuery: DehydratedPreloadedQuery<TQuery>,
  queryCache: QueryCache,
): StreamedPreloadedQuery<TQuery> {
  let isDisposed = false;
  let isReleased = false;

  debug.log("hydrating query");
  // build the query on the client
  const _query = queryCache.build(dehydratedQuery.$__relay_queryRef.operation);

  return {
    kind: dehydratedQuery.kind,
    dispose() {
      if (isDisposed) {
        return;
      }
      isDisposed = true;
    },
    get isDisposed(): boolean {
      return isDisposed || isReleased;
    },
    environment,
    environmentProviderOptions: dehydratedQuery.environmentProviderOptions,
    fetchKey: dehydratedQuery.fetchKey,
    fetchPolicy: dehydratedQuery.fetchPolicy,
    networkCacheConfig: dehydratedQuery.networkCacheConfig,
    id: dehydratedQuery.id,
    name: dehydratedQuery.name,
    variables: dehydratedQuery.variables,
    $__relay_queryRef: dehydratedQuery.$__relay_queryRef,
  };
}

export function createPreloadedQuerySerializer<TQuery extends OperationType>(
  environment: Environment,
  queryCache: QueryCache,
) {
  return createSerializationAdapter<
    StreamedPreloadedQuery<TQuery>,
    DehydratedPreloadedQuery<TQuery>
  >({
    key: "relay-ssr-preloaded-query",
    test: isStreamedPreloadedQuery,
    // @ts-expect-error tanstack-serialization
    toSerializable: (value) => {
      return dehydratePreloadedQuery(value);
    },
    fromSerializable: (value) => {
      return hydratePreloadedQuery(environment, value, queryCache);
    },
  });
}

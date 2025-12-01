import { useMemo } from 'react';
import relay, { type GraphQLTaggedNode, type PreloadedQuery } from 'react-relay';
import type { OperationType, RenderPolicy } from 'relay-runtime';
import { useTransportValue } from './use-transport-value.ts';
const { usePreloadedQuery } = relay;

export function useStreamedQuery<TQuery extends OperationType>(
  query: GraphQLTaggedNode,
  preloadedQuery: PreloadedQuery<TQuery>,
  options?: {
    UNSTABLE_renderPolicy?: RenderPolicy | undefined;
  },
) {
  const result = usePreloadedQuery(query, preloadedQuery, options) as Record<string, unknown>;

  const forTransport = useMemo<Partial<typeof result>>(() => {
    const transport: Partial<typeof result> = {};
    for (const key of ['data', 'error', 'isLoading', 'isError', 'isSuccess', 'isFetching']) {
      transport[key] = result[key];
    }
    return transport;
  }, [result]);

  const transported = useTransportValue(forTransport);

  return useMemo(() => ({ ...result, ...transported }), [result, transported]);
}

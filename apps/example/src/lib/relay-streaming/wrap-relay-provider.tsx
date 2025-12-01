import { createContext, useMemo, type FC } from 'react';
import type { QueryEvent, QueryProgressEvent } from './transport.ts';
import { Environment, ReplaySubject } from 'relay-runtime';
import relay from 'react-relay';
import type { QueryCache } from './query-cache.ts';

const { RelayEnvironmentProvider } = relay;

export interface DataTransportAbstraction {
  /**
   * This hook should always return the first value it was called with.
   *
   * If used in the browser and SSR happened, it should return the value passed to it on the server.
   */
  useStaticValueRef<T>(value: T): { current: T };
}

export type DataTransportProviderImplementation<TExtraProps> = FC<
  {
    /** will be present in the Browser */
    onQueryEvent?: (event: QueryEvent) => void;
    /** will be present in the Browser */
    rerunSimulatedQueries?: () => void;
    /** will be present during SSR */
    registerDispatchRequestStarted?: (
      callback: (query: {
        event: Extract<QueryEvent, { type: 'started' }>;
        replaySubject: ReplaySubject<QueryProgressEvent>;
      }) => void,
    ) => void;
    /** will always be present */
    children: React.ReactNode;
  } & TExtraProps
>;

export const DataTransportContext = createContext<DataTransportAbstraction | null>(null);

export type GetEnvironmentFn = () => { environment: Environment; queryCache: QueryCache };

export type WrappedRelayProviderProps<P> = {
  getEnvironment: GetEnvironmentFn;
  children: React.ReactNode;
} & P;

export function WrapRelayProvider<P>(TransportProvider: DataTransportProviderImplementation<P>) {
  const WrappedRelayProvider = (props: WrappedRelayProviderProps<P>) => {
    const { getEnvironment, children, ...extraProps } = props;

    const { environment, queryCache } = useMemo(() => getEnvironment(), []);

    return (
      <RelayEnvironmentProvider environment={environment}>
        <TransportProvider
          onQueryEvent={(event) =>
            event.type === 'started'
              ? queryCache.onQueryStarted(event)
              : queryCache.onQueryProgress(event)
          }
          rerunSimulatedQueries={() => queryCache.rerunSimulatedQueries(environment)}
          registerDispatchRequestStarted={queryCache.watchQueryQueue?.register}
          {...(extraProps as P)}
        >
          {children}
        </TransportProvider>
      </RelayEnvironmentProvider>
    );
  };
  return WrappedRelayProvider;
}

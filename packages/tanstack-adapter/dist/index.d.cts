import * as relay_runtime from 'relay-runtime';
import { OperationDescriptor, GraphQLResponse, ReplaySubject, Environment, ExecuteFunction, OperationType, GraphQLTaggedNode, VariablesOf } from 'relay-runtime';
import { LoadQueryOptions, EnvironmentProviderOptions, PreloadedQuery, OperationDescriptor as OperationDescriptor$1 } from 'react-relay';
import { AnyRouter } from '@tanstack/react-router';

type ReadableStreamRelayEvent<T extends GraphQLResponse = GraphQLResponse> = {
    type: 'next';
    data: T;
} | {
    type: 'error';
    error: string | Record<string, unknown>;
} | {
    type: 'complete';
};
type QueryEvent = {
    type: 'started';
    operation: OperationDescriptor;
    id: string;
} | (ReadableStreamRelayEvent & {
    id: string;
});
type QueryProgressEvent = Exclude<QueryEvent, {
    type: 'started';
}>;

declare class RelayQuery {
    private _uuid;
    private _operation;
    queryKey: string;
    replaySubject: ReplaySubject<QueryProgressEvent>;
    isComplete: boolean;
    hasData: boolean;
    constructor(operation: OperationDescriptor);
    getOperation(): OperationDescriptor;
}

declare const createQueryCache: (isServer?: boolean) => QueryCache;
declare class QueryCache {
    private _isServer;
    watchQueryQueue: {
        push: (value: {
            event: Extract<QueryEvent, {
                type: "started";
            }>;
            replaySubject: ReplaySubject<QueryProgressEvent>;
        }) => void;
        register: (callback: ((value: {
            event: Extract<QueryEvent, {
                type: "started";
            }>;
            replaySubject: ReplaySubject<QueryProgressEvent>;
        }) => void) | null) => void;
    };
    private simulatedStreamingQueries;
    queries: Map<string, RelayQuery>;
    constructor(isServer?: boolean);
    build(operation: OperationDescriptor): RelayQuery;
    add(query: RelayQuery): void;
    get(queryId: string): RelayQuery | undefined;
    onQueryStarted(event: Extract<QueryEvent, {
        type: 'started';
    }>): void;
    onQueryProgress(event: QueryProgressEvent): void;
    /**
     * Can be called when the stream closed unexpectedly while there might still be unresolved
     * simulated server-side queries going on.
     * Those queries will be cancelled and then re-run in the browser.
     */
    rerunSimulatedQueries: (environment: Environment) => relay_runtime.Observable<relay_runtime.GraphQLResponse> | undefined;
    watchQuery(operation: OperationDescriptor, replaySubject: ReplaySubject<QueryProgressEvent>): void;
}

interface RelayReplayNetworkConfig {
    url: string;
    fetchOpts: RequestInit;
    queryCache: QueryCache;
    isServer: boolean;
}
declare class RelayReplayNetwork {
    execute: ExecuteFunction;
    queryCache: QueryCache;
    private _url;
    private _fetchOpts;
    private _fetchFn;
    private _isServer;
    constructor(config: RelayReplayNetworkConfig);
}

interface StreamedPreloadedQuery<TQuery extends OperationType> extends PreloadedQuery<TQuery> {
    $__relay_queryRef: {
        operation: OperationDescriptor$1;
    };
}
type PreloaderFunction = <TQuery extends OperationType>(request: GraphQLTaggedNode, variables: VariablesOf<TQuery>, options?: LoadQueryOptions, environmentProviderOptions?: EnvironmentProviderOptions) => PreloadedQuery<OperationType> | StreamedPreloadedQuery<OperationType>;
declare const createPreloader: <TQuery extends OperationType>(environment: Environment, queryCache: QueryCache) => PreloaderFunction;

interface RelayRouterContext {
    environment: Environment;
    preloadQuery: ReturnType<typeof createPreloader>;
}
type ValidateRouter<TRouter extends AnyRouter> = NonNullable<TRouter['options']['context']> extends RelayRouterContext ? TRouter : never;
declare function routerWithRelay<TRouter extends AnyRouter>(router: ValidateRouter<TRouter>, environment: Environment, queryCache: QueryCache): TRouter;

export { QueryCache, RelayReplayNetwork, type RelayRouterContext, type ValidateRouter, createQueryCache, routerWithRelay };

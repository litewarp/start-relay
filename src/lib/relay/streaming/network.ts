import {
	type ExecuteFunction,
	type FetchFunction,
	type GraphQLResponse,
	Network,
	Observable,
} from "relay-runtime";
import { multipartFetch } from "~/lib/fetch-multipart/index.ts";
import { debug } from "../debug.ts";
import type { QueryCache, QueryCacheNotifyEvent } from "./query-cache.ts";

interface RelayReplayNetworkConfig {
	url: string;
	fetchOpts: RequestInit;
	queryCache: QueryCache;
	isServer: boolean;
}

export class RelayReplayNetwork {
	public execute: ExecuteFunction;
	public queryCache: QueryCache;

	private _url: string;
	private _fetchOpts: RequestInit;
	private _fetchFn: FetchFunction;
	private _isServer: boolean;

	constructor(config: RelayReplayNetworkConfig) {
		const { url, fetchOpts, queryCache, isServer } = config;
		this._url = url;
		this._fetchOpts = fetchOpts;
		this._isServer = isServer;
		this.queryCache = queryCache;

		this._fetchFn = (request, variables, cacheConfig, uploadables) => {
			debug(`fetching ${typeof window === "undefined" ? "in server" : "in browser"}`);

			// const forceFetch = cacheConfig?.force ?? false;

			const signal =
				cacheConfig?.metadata?.signal && cacheConfig?.metadata?.signal instanceof AbortSignal
					? cacheConfig.metadata.signal
					: undefined;

			const query = this.queryCache.build(request, variables, cacheConfig, uploadables);

			// if we are on the client, we check to see if we have a replayer
			// if so, we return the replayed observable
			if (!this._isServer) {
				if (query.isQuery()) {
					const replaySubject = this.queryCache.getReplaySubject(query.queryId);
					if (replaySubject) {
						console.log("has replaySubject");
						return Observable.create<GraphQLResponse>((sink) => {
							replaySubject.subscribe(sink);
						});
					}
				}
			}

			return Observable.create<GraphQLResponse>((sink) => {
				multipartFetch<GraphQLResponse>(this._url, {
					method: this._fetchOpts?.method ?? "POST",
					headers: {
						"content-type": "application/json",
						...(this._fetchOpts.headers ?? {}),
					},
					body: JSON.stringify({
						id: request.id,
						query: request.text,
						variables,
					}),
					credentials: this._fetchOpts.credentials,
					signal,
					onComplete: () => {
						sink.complete();
						this._publish({ type: "complete", query });
					},
					onError: (error) => {
						sink.error(error);
						this._publish({ type: "error", query, error: error });
					},
					onNext: (value) => {
						//TODO: check if there are additional values
						sink.next(value[0]);
						this._publish({ type: "data", query, data: value });
					},
				});
			});
		};

		const network = Network.create(this._fetchFn);
		this.execute = network.execute;
	}

	_publish(event: QueryCacheNotifyEvent) {
		if (!this._isServer) {
			return;
		}
		this.queryCache.notify(event);
	}

	_replay(queryId: string) {
		if (this._isServer) {
			console.warn(`replaying query ${queryId} on server -- noop`);
			return;
		}
	}
}

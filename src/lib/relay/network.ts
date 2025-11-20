import type {
	InitialIncrementalExecutionResult,
	SubsequentIncrementalExecutionResult,
} from "graphql";
import { type ExecuteFunction, type FetchFunction, Network, Observable } from "relay-runtime";
import { multipartFetch } from "~/lib/fetch-multipart/index.ts";
import type { QueryCache } from "./query-cache.ts";
import { RelayIncrementalDeliveryTransformer } from "./transformer.ts";

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
	// biome-ignore lint/correctness/noUnusedPrivateClassMembers: bound to network
	private _fetchFn: FetchFunction;
	private _isServer: boolean;

	constructor(config: RelayReplayNetworkConfig) {
		const { url, fetchOpts, queryCache, isServer } = config;
		this._url = url;
		this._fetchOpts = fetchOpts;
		this._isServer = isServer;
		this.queryCache = queryCache;

		this._fetchFn = (request, variables, cacheConfig, uploadables) => {
			// console.log(`starting fetch ${typeof window === "undefined" ? "in server" : "in browser"}`);

			// const forceFetch = cacheConfig?.force ?? false;

			const signal =
				cacheConfig?.metadata?.signal && cacheConfig?.metadata?.signal instanceof AbortSignal
					? cacheConfig.metadata.signal
					: undefined;

			const query = this.queryCache.build(request, variables, cacheConfig, uploadables);

			if (query.hasData) {
				return Observable.create((sink) => {
					// console.log("returning from replay");
					query.subscribe(sink);
				});
			}

			const obs = Observable.create((sink) => {
				const transformer = new RelayIncrementalDeliveryTransformer((...args) => {
					if (this._isServer) {
						console.log("notify", args);
						this.queryCache.notify({ type: "data", query, data: args[0] });
					}
					sink.next(...args);
				});
				multipartFetch<InitialIncrementalExecutionResult | SubsequentIncrementalExecutionResult>(
					this._url,
					{
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
						signal: this._isServer ? undefined : signal,
						onComplete: () => {
							sink.complete();
						},
						onError: (error) => {
							sink.error(error);
						},
						onNext: (value) => {
							console.log("raw value from multipartFetch", value);
							transformer.onNext(value);
						},
					},
				);
			});

			return obs;
		};

		const network = Network.create(this._fetchFn);
		this.execute = network.execute;
	}
}

import {
	type CacheConfig,
	type GraphQLResponse,
	ReplaySubject,
	type RequestParameters,
	type UploadableMap,
	type Variables,
} from "relay-runtime";
import type { Subscription } from "relay-runtime/lib/network/RelayObservable.js";
import { buildQueryId, RelayQuery } from "./relay-query.ts";
import { Subscribable } from "./subscribable.ts";
import type { DefaultError, NotifyEvent } from "./types.ts";

interface NotifyEventQueryAdded extends NotifyEvent {
	type: "added";
	query: RelayQuery;
}

interface NotifyEventQueryData extends NotifyEvent {
	type: "data";
	query: RelayQuery;
	data: GraphQLResponse[];
}

interface NotifyEventQueryError extends NotifyEvent {
	type: "error";
	query: RelayQuery;
	error: DefaultError;
}

interface NotifyEventQueryComplete extends NotifyEvent {
	type: "complete";
	query: RelayQuery;
}

export type QueryCacheNotifyEvent =
	| NotifyEventQueryAdded
	| NotifyEventQueryData
	| NotifyEventQueryError
	| NotifyEventQueryComplete;

type DispatchFn = (event: QueryCacheNotifyEvent) => void;

export interface QueryStore {
	has: (queryHash: string) => boolean;
	set: (queryHash: string, query: RelayQuery) => void;
	get: (queryHash: string) => RelayQuery | undefined;
	delete: (queryHash: string) => void;
	values: () => IterableIterator<RelayQuery>;
}

export class QueryCache<
	T extends QueryCacheNotifyEvent = QueryCacheNotifyEvent,
> extends Subscribable<DispatchFn> {
	queries: QueryStore;
	_replayComplete: boolean = false;
	_events: Array<T> = [];
	_subscriptions: Array<Subscription> = [];
	_streamedData: Map<string, ReplaySubject<GraphQLResponse>>;

	constructor() {
		super();
		this.queries = new Map<string, RelayQuery>();
		this._streamedData = new Map<string, ReplaySubject<GraphQLResponse>>();
	}

	notify(event: QueryCacheNotifyEvent): void {
		// only on server
		this.listeners.forEach((listener) => {
			listener(event);
		});
		// only on client
		// const stream = this._streamedData.get(event.query.queryId);
		// if (stream) {
		// 	if (event.type === "data") {
		// 		const data = Array.isArray(event.data) ? event.data : [event.data];
		// 		data.forEach((d) => {
		// 			stream.next(d);
		// 		});
		// 	} else if (event.type === "complete") {
		// 		stream.complete();
		// 	}
		// }
	}

	build(
		request: RequestParameters,
		variables: Variables,
		cacheConfig: CacheConfig,
		uploadables?: UploadableMap | null,
	): RelayQuery {
		const queryId = buildQueryId(request, variables);
		let query = this.get(queryId);

		if (!query) {
			query = new RelayQuery({ request, variables, cacheConfig, uploadables });
			this.add(query);
		}
		return query;
	}

	add(query: RelayQuery): void {
		if (!this.queries.has(query.queryId)) {
			this.queries.set(query.queryId, query);
		}
	}

	get(queryId: string): RelayQuery | undefined {
		return this.queries.get(queryId);
	}

	getReplaySubject(queryId: string): ReplaySubject<GraphQLResponse> | undefined {
		return this._streamedData.get(queryId);
	}

	createReplaySubject(queryId: string): ReplaySubject<GraphQLResponse> {
		let subject = this._streamedData.get(queryId);
		if (subject) {
			console.warn("already have a replay subject");
			return subject;
		}
		subject = new ReplaySubject<GraphQLResponse>();
		this._streamedData.set(queryId, subject);
		return subject;
	}
}

import type {
	CacheConfig,
	GraphQLResponse,
	RequestParameters,
	UploadableMap,
	Variables,
} from "relay-runtime";
import { ReplaySubject } from "relay-runtime";
import type { Sink, Subscription } from "relay-runtime/lib/network/RelayObservable.js";

interface RelayQueryConfig {
	request: RequestParameters;
	variables: Variables;
	cacheConfig: CacheConfig;
	uploadables?: UploadableMap | null;
}

export const buildQueryId = (request: RequestParameters, variables: Variables = {}): string => {
	const cacheKey = request.id ?? request.cacheID;
	return `${cacheKey}:${JSON.stringify(variables)}`;
};

export class RelayQuery {
	queryId: string;
	request: RequestParameters;
	variables: Variables;
	cacheConfig: CacheConfig;
	uploadables?: UploadableMap | null;
	replaySubject: ReplaySubject<GraphQLResponse>;
	hasData?: boolean = false;
	isComplete?: boolean = false;

	constructor(config: RelayQueryConfig) {
		const { request, variables, cacheConfig, uploadables } = config;
		this.request = request;
		this.variables = variables;
		this.queryId = buildQueryId(request, variables);
		this.cacheConfig = cacheConfig;
		this.uploadables = uploadables;
		this.replaySubject = new ReplaySubject<GraphQLResponse>();
	}

	isQuery(): boolean {
		return this.request.operationKind === "query";
	}

	next(val: GraphQLResponse) {
		this.replaySubject.next(val);
		this.hasData = true;
	}

	error(err: Error) {
		console.log("error", err);
	}

	complete() {
		this.replaySubject.complete();
		this.isComplete = true;
	}

	subscribe(observer: Sink<GraphQLResponse>): Subscription {
		return this.replaySubject.subscribe(observer);
	}
}

import type { CacheConfig, RequestParameters, UploadableMap, Variables } from "relay-runtime";

interface RelayQueryConfig {
	request: RequestParameters;
	variables: Variables;
	cacheConfig: CacheConfig;
	uploadables?: UploadableMap | null;
}

export class RelayQuery {
	queryId: string;
	request: RequestParameters;
	variables: Variables;
	cacheConfig: CacheConfig;
	abortSignalConsumed: boolean;
	uploadables?: UploadableMap | null;

	constructor(config: RelayQueryConfig) {
		const { request, variables, cacheConfig, uploadables } = config;
		this.abortSignalConsumed = false;
		this.request = request;
		this.variables = variables;
		this.queryId = buildQueryId(request, variables);
		this.cacheConfig = cacheConfig;
		this.uploadables = uploadables;
	}

	isQuery(): boolean {
		return this.request.operationKind === "query";
	}
}

export const buildQueryId = (request: RequestParameters, variables: Variables = {}): string => {
	const cacheKey = request.id ?? request.cacheID;
	return `${cacheKey}:${JSON.stringify(variables)}`;
};

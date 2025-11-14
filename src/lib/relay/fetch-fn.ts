import {
	type CacheConfig,
	type FetchFunction,
	Observable,
	type RequestParameters,
	type UploadableMap,
	type Variables,
} from "relay-runtime";
import { multipartFetch } from "../fetch-multipart/index.ts";

export const fetchFn: FetchFunction = (
	request: RequestParameters,
	variables: Variables,
	cacheConfig: CacheConfig,
	_uploadables?: UploadableMap | null,
) => {
	const { metadata } = cacheConfig;
	return Observable.create((sink) => {
		multipartFetch("/api/graphql", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				id: request.id,
				query: request.text,
				variables,
			}),
			credentials: "include",
			signal: metadata?.signal instanceof AbortSignal ? metadata.signal : undefined,
			// @ts-expect-error graphqlStuff
			onNext: (parts) => sink.next(parts),
			onError: (err) => sink.error(err instanceof Error ? err : new Error(`Unknown error: $err`)),
			onComplete: () => sink.complete(),
		});
	});
};

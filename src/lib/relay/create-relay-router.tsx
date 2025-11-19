import type { AnyRouter } from "@tanstack/react-router";
import { Fragment, type ReactNode } from "react";
import relay from "react-relay";
import relayruntime, {
	type EnvironmentConfig,
	type GraphQLResponse,
	type Observable,
	type OperationType,
	type Environment as RelayEnvironment,
} from "relay-runtime";
import type { RelayModernRecord } from "relay-runtime/lib/store/RelayModernRecord.js";
import type { RecordMap } from "relay-runtime/lib/store/RelayStoreTypes.js";
import { createPushableStream } from "./stream.ts";
import { dehydrateQuery } from "./streaming/hydration.ts";
import { createPreloader, type SerializablePreloadedQuery } from "./streaming/preloader.ts";
import type { QueryCache } from "./streaming/query-cache.ts";
import { buildQueryId } from "./streaming/relay-query.ts";

const { RelayEnvironmentProvider } = relay;

const { RecordSource, Observable } = relayruntime;

interface User {
	id: string;
	email: string;
	name: string;
}

export interface RelayRouterContext {
	environment: RelayEnvironment;
	user: User | null;
	preloadQuery: ReturnType<typeof createPreloader>;
}

type AdditionalOptions = {
	WrapProvider?: (props: { children: ReactNode }) => React.JSX.Element;
	queryCache: QueryCache;
};

export type ValidateRouter<TRouter extends AnyRouter> = NonNullable<
	TRouter["options"]["context"]
> extends RelayRouterContext
	? TRouter
	: never;

type StreamedData = SerializablePreloadedQuery<OperationType> & {
	type: "data" | "error" | "complete";
};

interface DehydratedRouterQueryState {
	dehydratedEnvironment: RecordMap;
	queryStream: ReadableStream<StreamedData>;
}

export function createRelayRouter<TRouter extends AnyRouter>(
	router: ValidateRouter<TRouter>,
	environment: RelayEnvironment,
	additionalOpts: AdditionalOptions,
): TRouter {
	const queryCache = additionalOpts.queryCache;
	const ogOptions = router.options;

	router.options = {
		...router.options,
		context: {
			...ogOptions.context,
			environment: environment,
			preloadQuery: createPreloader(environment),
		},
		Wrap: ({ children }) => {
			const OuterWrapper = additionalOpts.WrapProvider || Fragment;
			const OGWrap = ogOptions.Wrap || Fragment;
			return (
				<OuterWrapper>
					<RelayEnvironmentProvider environment={environment}>
						<OGWrap>{children}</OGWrap>
					</RelayEnvironmentProvider>
				</OuterWrapper>
			);
		},
	};

	const ogHydrate = router.options.hydrate;
	const ogDehydrate = router.options.dehydrate;

	if (router.isServer) {
		const sentQueries = new Set<string>();
		const queryStream = createPushableStream<StreamedData>();

		router.options.dehydrate = async (): Promise<DehydratedRouterQueryState> => {
			if (!router.serverSsr) {
				throw new Error("Server-side rendering is not enabled");
			}
			router.serverSsr.onRenderFinished(() => {
				console.log("render finished");
				queryStream.close();
			});
			const ogDehydrated = await ogDehydrate?.();
			const dehydratedRouter: DehydratedRouterQueryState = {
				...ogDehydrated,
				queryStream: queryStream.stream,
			};
			dehydratedRouter.dehydratedEnvironment = environment.getStore().getSource().toJSON();
			return dehydratedRouter;
		};

		if (queryCache) {
			queryCache.subscribe((event) => {
				console.log(event);
				const { params, variables } = dehydrateQuery(event.query);

				if (event.type === "data") {
					if (!router.serverSsr?.isDehydrated()) {
						return;
					}

					if (queryStream.isClosed()) {
						console.warn(
							`tried to stream query ${event.query.queryId} after stream was already closed`,
						);
						return;
					}
					if (sentQueries.has(event.query.queryId)) {
						console.log("query already sent");
					}
					sentQueries.add(event.query.queryId);
					queryStream.enqueue({
						type: "data",
						params,
						variables,
						response: event.data,
					});
					return;
				} else if (event.type === "complete") {
					//noop
					sentQueries.add(event.query.queryId);
				} else if (event.type === "error") {
					console.error(event);
					return;
				}
			});
		}
	} else {
		router.options.hydrate = async (dehydrated: DehydratedRouterQueryState) => {
			await ogHydrate?.(dehydrated);
			if (dehydrated.dehydratedEnvironment) {
				const source = dehydrated.dehydratedEnvironment;
				console.log("dehydrated", source);
				environment.getStore().publish(new RecordSource(source));
			}

			observableFromStream(dehydrated.queryStream).subscribe({
				next: (value) => {
					console.log("value", value);
					if (value) {
						const query = queryCache.build(value.params, value.variables, {}, {});
						query.next(value.response as GraphQLResponse);
					}
				},
				error: (error) => {
					console.error(error);
				},
				complete: () => {
					console.log("done");
				},
			});
		};
	}
	return router;
}

function observableFromStream<T>(stream: ReadableStream<T>): Observable<T> {
	return Observable.create<T>((subscriber) => {
		stream.pipeTo(
			new WritableStream({
				write: (chunk) => {
					subscriber.next(chunk);
				},
				abort: (error) => {
					subscriber.error(error);
				},
				close: () => {
					subscriber.complete();
				},
			}),
		);
		return () => {
			if (!stream.locked) {
				stream.cancel();
			}
		};
	});
}

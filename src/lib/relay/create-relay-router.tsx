import type { AnyRouter } from "@tanstack/react-router";
import { Fragment, type ReactNode } from "react";
import relay from "react-relay";
import relayruntime, {
	type OperationType,
	type Environment as RelayEnvironment,
} from "relay-runtime";
import type { RelayModernRecord } from "relay-runtime/lib/store/RelayModernRecord.js";
import type { RecordMap } from "relay-runtime/lib/store/RelayStoreTypes.js";
import { createPushableStream } from "./stream.ts";
import { dehydrateQuery } from "./streaming/hydration.ts";
import { createPreloader, type SerializablePreloadedQuery } from "./streaming/preloader.ts";
import type { QueryCache } from "./streaming/query-cache.ts";

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

interface DehydratedRouterQueryState<TOptions = RelayModernRecord> {
	dehydratedEnvironment?: {
		options: TOptions;
		recordSource: RecordMap;
	};
	queryStream: ReadableStream<StreamedData>;
}

let dehydrateCount = 0;

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

	if (router.isServer) {
		const sentQueries = new Set<string>();
		const queryStream = createPushableStream<StreamedData>();

		router.options.dehydrate = async (): Promise<DehydratedRouterQueryState> => {
			dehydrateCount++;
			console.log(`dehydrateCount: ${dehydrateCount}`);
			const ogDehydrated = await ogOptions?.dehydrate?.();
			const dehydratedEnvironnment = {
				options: environment.options,
				recordSource: environment.getStore().getSource().toJSON(),
			};

			// add sentQueries to dehydratedEnvironnment

			if (!router.serverSsr) {
				throw new Error("Server-side rendering is not enabled");
			}

			router.serverSsr.onRenderFinished(() => {
				console.log("render finished");
				queryStream.close();
			});

			if (queryCache) {
				queryCache.subscribe((event) => {
					// before rendering starts, we do not stream individual queries
					// instead we dehydrate the entire query client in router's dehydrate()
					// if attachRouterServerSsrUtils() has not been called yet, `router.serverSsr` will be undefined and we also do not stream
					if (!router.serverSsr?.isDehydrated()) {
						return;
					}
					const { params, variables } = dehydrateQuery(event.query);

					if (event.type === "data") {
						console.log("sent data", event);
						if (sentQueries.has(event.query.queryId)) {
							console.warn(`query ${event.query.queryId} was already sent`);
							return;
						}
						if (queryStream.isClosed()) {
							console.warn(
								`tried to stream query ${event.query.queryId} after stream was already closed`,
							);
							return;
						}
						sentQueries.add(event.query.queryId);
						queryStream.enqueue({
							type: "data",
							params,
							variables,
							recordMap: environment.getStore().getSource().toJSON(),
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

			return {
				...ogDehydrated,
				dehydratedEnvironnment,
				queryStream: queryStream.stream,
			};
		};
	} else {
		router.options.hydrate = async (dehydrated: DehydratedRouterQueryState) => {
			await ogOptions.hydrate?.(dehydrated);
			if (dehydrated.dehydratedEnvironment?.recordSource) {
				environment
					.getStore()
					.publish(new RecordSource(dehydrated.dehydratedEnvironment.recordSource));
			}
			readableStreamToObservable<SerializablePreloadedQuery<OperationType>>(
				dehydrated.queryStream,
			).subscribe({
				next: (value) => {
					console.log("streamed value", value);
					if (!value) {
						throw new Error("No value");
					}
					const store = environment.getStore();
					store.publish(new RecordSource(value.recordMap));
				},
			});
		};
	}

	return router;
}

function readableStreamToObservable<T>(stream: ReadableStream) {
	return Observable.create<T>((sink) => {
		const reader = stream.getReader();
		reader
			.read()
			.then(({ done, value }) => {
				if (!done) {
					sink.next(value);
				} else {
					sink.complete();
				}
			})
			.catch((error) => {
				sink.error(error);
			});
	});
}

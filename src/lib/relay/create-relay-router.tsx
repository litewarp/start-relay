import type { AnyRouter } from "@tanstack/react-router";
import { Fragment, type ReactNode } from "react";
import relay from "react-relay";
import relayruntime, {
	type GraphQLResponse,
	type Environment as RelayEnvironment,
} from "relay-runtime";
import type { RelayModernRecord } from "relay-runtime/lib/store/RelayModernRecord.js";
import type { RecordMap } from "relay-runtime/lib/store/RelayStoreTypes.js";
import { createPreloader } from "./preloader.ts";
import { createPushableStream } from "./stream.ts";

const { RelayEnvironmentProvider } = relay;

const { RecordSource } = relayruntime;

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
};

export type ValidateRouter<TRouter extends AnyRouter> = NonNullable<
	TRouter["options"]["context"]
> extends RelayRouterContext
	? TRouter
	: never;

interface StreamResponse {
	response: GraphQLResponse;
	queryId: string;
}

interface DehydratedRouterQueryState<TOptions = RelayModernRecord> {
	dehydratedEnvironment?: {
		options: TOptions;
		recordSource: RecordMap;
	};
	queryStream: ReadableStream<StreamResponse>;
}

export function createRelayRouter<TRouter extends AnyRouter>(
	router: ValidateRouter<TRouter>,
	environment: RelayEnvironment,
	additionalOpts?: AdditionalOptions,
): TRouter {
	const ogOptions = router.options;

	router.options = {
		...router.options,
		context: {
			...ogOptions.context,
			environment: environment,
			preloadQuery: createPreloader(environment),
		},
		Wrap: ({ children }) => {
			const OuterWrapper = additionalOpts?.WrapProvider || Fragment;
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
		const queryStream = createPushableStream();
		router.options.dehydrate = async (): Promise<DehydratedRouterQueryState> => {
			const ogDehydrated = await ogOptions?.dehydrate?.();
			const dehydratedEnvironnment = {
				options: environment.options,
				recordSource: environment.getStore().getSource().toJSON(),
			};

			if (!router.serverSsr) {
				throw new Error("Server-side rendering is not enabled");
			}

			router.serverSsr.onRenderFinished(() => queryStream.close());

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
			const reader = dehydrated.queryStream.getReader();
			reader
				.read()
				.then(async function handle({ done, value }) {
					//@ts-expect-error idk
					environment.getStore().publish(new RecordSource(value));
					if (done) {
						return;
					}
					const result = await reader.read();
					return handle(result);
				})
				.catch((e) => {
					console.error(`Error reading query stream: ${e}`);
				});
		};
	}

	return router;
}

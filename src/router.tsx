import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { createEnvironment } from "~/lib/relay/environment.ts";
import { DefaultCatchBoundary } from "./components/DefaultCatchBoundary.tsx";
import { NotFound } from "./components/NotFound.tsx";
import { createRelayRouter } from "./lib/relay/create-relay-router.tsx";
import { QueryCache } from "./lib/relay/query-cache.ts";
import { routeTree } from "./routeTree.gen.ts";

const queryCache = new QueryCache();
const environment = createEnvironment(queryCache);

export function getRouter() {
	return createRelayRouter(
		createTanStackRouter({
			routeTree,
			defaultPreload: "intent",
			defaultErrorComponent: DefaultCatchBoundary,
			defaultNotFoundComponent: () => <NotFound />,
			scrollRestoration: true,
			context: {
				environment: null,
				user: null,
				preloadQuery: null,
			},
		}),
		environment,
		{ queryCache },
	);
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}

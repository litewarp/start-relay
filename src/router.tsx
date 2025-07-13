import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { createEnvironment } from "~/lib/relay/environment.ts";
import { DefaultCatchBoundary } from "./components/DefaultCatchBoundary.tsx";
import { NotFound } from "./components/NotFound.tsx";
import { createRelayRouter } from "./lib/relay/create-relay-router.tsx";
import { routeTree } from "./routeTree.gen.ts";

export function getRouter() {
	const environment = createEnvironment();

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
	);
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}

import { createFileRoute } from "@tanstack/react-router";
import { handler } from "~/lib/yoga/server.ts";

export const Route = createFileRoute("/api/graphql")({
	server: {
		handlers: {
			GET: handler,
			POST: handler,
		},
	},
});

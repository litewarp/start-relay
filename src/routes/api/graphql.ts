import { createFileRoute } from "@tanstack/react-router";
import { graphqlHandler } from "~/lib/graphql/handler.ts";

export const Route = createFileRoute("/api/graphql")({
	server: {
		handlers: {
			GET: graphqlHandler,
			POST: graphqlHandler,
		},
	},
});

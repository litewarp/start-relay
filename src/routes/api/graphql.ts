import { createServerFileRoute } from "@tanstack/react-start/server";
import { yoga } from "~/lib/yoga";

const adapter = async ({
	request,
	context,
}: {
	request: Request;
	context?: Record<string, unknown>;
}) => {
	const res = await yoga.handleRequest(request, context ?? {});
	return res;
};

export const ServerRoute = createServerFileRoute("/api/graphql").methods({
	GET: adapter,
	POST: adapter,
});

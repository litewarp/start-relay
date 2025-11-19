import { createFileRoute } from "@tanstack/react-router";
import { yoga } from "~/lib/yoga.ts";

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

export const Route = createFileRoute("/api/graphql")({
  server: {
    handlers: {
      GET: adapter,
      POST: adapter,
    },
  },
});

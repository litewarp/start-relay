import { createFileRoute } from "@tanstack/react-router";
import { handleMaybePromise } from "@whatwg-node/promise-helpers";
import type {
	InitialIncrementalExecutionResult,
	SubsequentIncrementalExecutionResult,
} from "graphql";
import { graphql } from "~/lib/graphql/executor.ts";
import { getSchema } from "~/lib/graphql/schema.ts";

const adapter = async ({
	request,
	context,
}: {
	request: Request;
	context?: Record<string, unknown>;
}) => {
	const req = await request.json();
	// const res = await yoga.handleRequest(request, context ?? {});
	const query = req.query;
	const variables = req.variables;
	const operationName = req.operationName;
	const rootValue = {};

	const result = await graphql({
		schema: getSchema(),
		source: query,
		variableValues: variables,
		operationName,
		contextValue: context,
		rootValue,
	});
	console.log("server result", result);
	if ("initialResult" in result) {
		const encoder = new TextEncoder();
		const { readable, writable } = new TransformStream();
		const writer = writable.getWriter();
		const reader = readable.getReader();

		const responseReadable = new ReadableStream({
			async pull(controller) {
				const { done, value } = await reader.read();
				done ? controller.close() : controller.enqueue(value);
			},
		});
		writer.write(encoder.encode("\r\n"));
		writer.write(encoder.encode("---"));
		writePartialResult(result.initialResult, encoder, writer);

		const iterator = result.subsequentResults[Symbol.asyncIterator]();

		await handleMaybePromise(
			() => iterator.next(),
			({ done, value }) => {
				if (value) {
					writePartialResult(value, encoder, writer);
				}
				if (done) {
					writer.write(encoder.encode("--\r\n"));
					writer.close();
				}
			},
		);

		return new Response(responseReadable, {
			headers: {
				"Content-Type": 'multipart/mixed; boundary="-"',
				Connection: "keep-alive",
				"Transfer-Encoding": "chunked",
			},
		});
	} else {
		return new Response(JSON.stringify(result), {
			headers: {
				"Content-Type": "application/json",
			},
		});
	}
};

export const Route = createFileRoute("/api/graphql")({
	server: {
		handlers: {
			GET: adapter,
			POST: adapter,
		},
	},
});

function writePartialResult(
	result: InitialIncrementalExecutionResult | SubsequentIncrementalExecutionResult,
	encoder: TextEncoder,
	writer: WritableStreamDefaultWriter,
) {
	writer.write(encoder.encode("\r\n"));
	writer.write(encoder.encode("Content-Type: application/json; charset=utf-8"));
	writer.write(encoder.encode("\r\n"));

	const chunk = JSON.stringify(result);
	const encodedChunk = encoder.encode(chunk);

	writer.write(encoder.encode(`Content-Length: ${encodedChunk.byteLength}`));
	writer.write(encoder.encode("\r\n"));

	writer.write(encoder.encode("\r\n"));
	writer.write(encodedChunk);
	writer.write(encoder.encode("\r\n"));

	writer.write(encoder.encode("---"));
}

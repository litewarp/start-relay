import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import type {
  InitialIncrementalExecutionResult,
  SubsequentIncrementalExecutionResult,
} from 'graphql';
import { graphql } from './executor.ts';
import { getSchema } from './schema.ts';

export async function graphqlHandler<TContext extends Record<string, unknown>>({
  request,
  context,
}: {
  request: Request;
  context: TContext;
}) {
  // Implementation of the GraphQL handler
  //
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
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const reader = readable.getReader();
  const responseReadable = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      done ? controller.close() : controller.enqueue(value);
    },
  });
  if ('initialResult' in result) {
    writer.write(encoder.encode('\r\n'));
    writer.write(encoder.encode('---'));
    writePartialResult(result.initialResult, encoder, writer);

    const iterator = result.subsequentResults[Symbol.asyncIterator]();

    handleMaybePromise(
      () => iterator.next(),
      ({ done, value }) => {
        if (value) {
          console.log('writing data to stream', value);
          writePartialResult(value, encoder, writer);
        }
        if (done) {
          writer.write(encoder.encode('--\r\n'));
          writer.close();
        }
      },
    );

    return new Response(responseReadable, {
      headers: {
        'Content-Type': 'multipart/mixed; boundary="-"',
      },
    });
  } else {
    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
function writePartialResult(
  result: InitialIncrementalExecutionResult | SubsequentIncrementalExecutionResult,
  encoder: TextEncoder,
  writer: WritableStreamDefaultWriter,
) {
  writer.write(encoder.encode('\r\n'));
  writer.write(encoder.encode('Content-Type: application/json; charset=utf-8'));
  writer.write(encoder.encode('\r\n'));

  const chunk = JSON.stringify(result);
  const encodedChunk = encoder.encode(chunk);

  writer.write(encoder.encode(`Content-Length: ${encodedChunk.byteLength}`));
  writer.write(encoder.encode('\r\n'));

  writer.write(encoder.encode('\r\n'));
  writer.write(encodedChunk);
  writer.write(encoder.encode('\r\n'));

  writer.write(encoder.encode('---'));
}

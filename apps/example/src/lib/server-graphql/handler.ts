import { Readable } from 'node:stream';

import { graphql } from './executor.ts';
import { getSchema } from './schema.ts';

import type {
  InitialIncrementalExecutionResult,
  SubsequentIncrementalExecutionResult,
} from 'graphql';

const schema = getSchema();

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

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const reader = readable.getReader();
  const responseReadable = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (value) {
        controller.enqueue(value);
      }
      if (done) {
        controller.close();
      }
    },
  });
  const result = await graphql({
    schema,
    source: query,
    variableValues: variables,
    operationName,
    contextValue: context,
    rootValue,
  });
  if ('initialResult' in result) {
    writer.write(encoder.encode('\r\n'));
    writer.write(encoder.encode('---'));
    writePartialResult(result.initialResult, encoder, writer);

    const stream = Readable.from(result.subsequentResults);
    stream.on('data', (data) => {
      writePartialResult(data, encoder, writer);
    });

    stream.on('close', () => {
      writer.write(encoder.encode('--\r\n'));
      writer.close();
    });

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

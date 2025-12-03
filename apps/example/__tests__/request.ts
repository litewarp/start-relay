import syncFs, { promises as fs } from 'node:fs';

import { PatchResolver } from '~/lib/fetch-multipart/patch-resolver.ts';
import { RelayIncrementalDeliveryTransformer } from '~/lib/relay/transformer.ts';

import { executeQuery } from './schema-setup.ts';

import {
  parse,
  type DocumentNode,
  type InitialIncrementalExecutionResult,
  type SubsequentIncrementalExecutionResult,
} from 'graphql';
import type { Variables } from 'relay-runtime';

const req = {
  id: null,
  query:
    'query streamQuery(\n' +
    '  $count: Int!\n' +
    '  $cursor: String\n' +
    ') {\n' +
    '  alphabet(first: $count, after: $cursor) {\n' +
    '    edges @stream(label: "streamQuery$stream$stream_alphabet", initialCount: 0) {\n' +
    '      cursor\n' +
    '      ...LetterFragment\n' +
    '      node {\n' +
    '        __typename\n' +
    '        id\n' +
    '      }\n' +
    '    }\n' +
    '    ... @defer(label: "streamQuery$defer$stream_alphabet$pageInfo") {\n' +
    '      pageInfo {\n' +
    '        hasNextPage\n' +
    '        endCursor\n' +
    '      }\n' +
    '    }\n' +
    '  }\n' +
    '}\n' +
    '\n' +
    'fragment LetterFragment on AlphabetEdge {\n' +
    '  node {\n' +
    '    id\n' +
    '    letter\n' +
    '  }\n' +
    '}\n',
  variables: { count: 10, cursor: null },
};

export async function complete(
  document: DocumentNode,
  variables: Variables,
  onResult: (result: any) => void,
) {
  const result = await executeQuery(document, variables, {});
  const transformer = new RelayIncrementalDeliveryTransformer((v) => onResult(v));
  if ('initialResult' in result) {
    transformer.onNext([result.initialResult]);
    for await (const patch of result.subsequentResults) {
      transformer.onNext([patch]);
    }
  }
  return result;
}

async function main() {
  const document = parse(req.query);
  const variables = req.variables;
  const writeStream = syncFs.createWriteStream('./__tests__/transformedStream.json');
  writeStream.write('[');
  await complete(document, variables, (v) => {
    writeStream.write(JSON.stringify(v));
    writeStream.write(',');
  }).then(() => {
    writeStream.write(']');
    writeStream.end();
  });
}

main();

import { getSchema } from '~/lib/graphql/schema.ts';

import { experimentalExecuteIncrementally, type DocumentNode } from 'graphql';
import type { OperationType, VariablesOf } from 'relay-runtime';

const schema = getSchema();

export async function executeQuery<TQuery extends OperationType>(
  document: DocumentNode,
  variableValues: VariablesOf<TQuery>,
  contextValue: object,
  operationName?: string,
) {
  return experimentalExecuteIncrementally({
    schema,
    document,
    variableValues,
    operationName,
    contextValue,
    rootValue: {},
  });
}

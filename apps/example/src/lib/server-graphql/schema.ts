import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { alphabet } from './alphabet.ts';

import {
  GraphQLDeferDirective,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLStreamDirective,
  GraphQLString,
  printSchema,
  specifiedDirectives,
} from 'graphql';
import {
  connectionArgs,
  connectionDefinitions,
  connectionFromArray,
  fromGlobalId,
  globalIdField,
  nodeDefinitions,
} from 'graphql-relay';

const { nodeInterface, nodeField } = nodeDefinitions((globalId) => {
  const { type, id } = fromGlobalId(globalId);
  switch (type) {
    case 'Alphabet':
      return { __typename: 'Alphabet', id };
    default:
      return null;
  }
});

export function getSchema(): GraphQLSchema {
  const AlphabetType = new GraphQLObjectType({
    name: 'Alphabet',
    interfaces: [nodeInterface],
    fields: {
      id: globalIdField(),
      letter: {
        type: GraphQLString,
      },
    },
  });

  const { connectionType: alphabetConnection } = connectionDefinitions({
    name: 'Alphabet',
    nodeType: AlphabetType,
  });

  const LanguageType = new GraphQLObjectType({
    name: 'Language',
    interfaces: [nodeInterface],
    fields: () => ({
      id: { ...globalIdField(), resolve: () => '1' },
      name: {
        type: new GraphQLNonNull(GraphQLString),
        resolve: async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return 'English';
        },
      },
      alphabet: {
        type: alphabetConnection,
        args: connectionArgs,
        resolve: async (_source, args) => {
          const result = connectionFromArray(alphabet, args);
          return {
            pageInfo: async () => {
              await new Promise((resolve) => setTimeout(resolve, 200));
              return result.pageInfo;
            },
            edges: async function* () {
              for (const edge of result.edges) {
                yield edge;
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            },
          };
        },
      },
    }),
  });

  return new GraphQLSchema({
    directives: [GraphQLDeferDirective, GraphQLStreamDirective, ...specifiedDirectives],
    query: new GraphQLObjectType({
      name: 'Query',
      fields: () => ({
        node: nodeField,
        language: {
          type: new GraphQLNonNull(LanguageType),
        },
        alphabet: {
          args: connectionArgs,
          type: alphabetConnection,
          resolve: async function (_source, args) {
            const result = connectionFromArray(alphabet, args);
            return {
              pageInfo: async () => {
                await new Promise((resolve) => setTimeout(resolve, 200));
                return result.pageInfo;
              },
              edges: async function* () {
                for (const edge of result.edges) {
                  yield edge;
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                }
              },
            };
          },
        },
        fastField: {
          type: new GraphQLNonNull(GraphQLString),
          resolve: () => 'Fast Field!',
        },
        slowField: {
          args: {
            waitFor: {
              type: GraphQLInt,
              defaultValue: 5000,
            },
          },
          type: new GraphQLNonNull(GraphQLString),
          resolve: async (_, { waitFor }) => {
            return new Promise((resolve) => setTimeout(() => resolve('Slow Field!'), waitFor));
          },
        },
      }),
    }),
  });
}

const outputPath = path.join(import.meta.dirname, '../../../', 'schema.graphql');

writeFileSync(outputPath, printSchema(getSchema()));

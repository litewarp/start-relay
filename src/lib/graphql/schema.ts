import { writeFileSync } from 'node:fs';
import path from 'node:path';
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
import { alphabet } from './alphabet.ts';

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

    return new GraphQLSchema({
        directives: [
            GraphQLDeferDirective,
            GraphQLStreamDirective,
            ...specifiedDirectives,
        ],
        query: new GraphQLObjectType({
            name: 'Query',
            fields: () => ({
                node: nodeField,
                alphabet: {
                    args: connectionArgs,
                    type: alphabetConnection,
                    resolve: async (_source, args) => {
                        const result = connectionFromArray(alphabet, args);
                        return {
                            pageInfo: async () => {
                                await new Promise((resolve) =>
                                    setTimeout(resolve, 500),
                                );
                                return result.pageInfo;
                            },
                            edges: async function* () {
                                for (const edge of result.edges) {
                                    yield edge;
                                    await new Promise((resolve) =>
                                        setTimeout(resolve, 1500),
                                    );
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
                        await new Promise((resolve) =>
                            setTimeout(resolve, waitFor),
                        );
                        return 'Slow Field!';
                    },
                },
            }),
        }),
    });
}

const outputPath = path.join(
    import.meta.dirname,
    '../../../',
    'schema.graphql',
);

writeFileSync(outputPath, printSchema(getSchema()));

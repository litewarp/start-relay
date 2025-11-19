import { writeFileSync } from "node:fs";
import path from "node:path";
import {
	GraphQLDeferDirective,
	GraphQLNonNull,
	GraphQLObjectType,
	GraphQLSchema,
	GraphQLStreamDirective,
	GraphQLString,
	printSchema,
	specifiedDirectives,
} from "graphql";
import {
	connectionArgs,
	connectionDefinitions,
	connectionFromArray,
	fromGlobalId,
	globalIdField,
	nodeDefinitions,
} from "graphql-relay";
import { alphabet } from "./alphabet.ts";

const { nodeInterface, nodeField } = nodeDefinitions((globalId) => {
	const { type, id } = fromGlobalId(globalId);
	switch (type) {
		case "Alphabet":
			return { __typename: "Alphabet", id };
		default:
			return null;
	}
});

export function getSchema(): GraphQLSchema {
	const AlphabetType = new GraphQLObjectType({
		name: "Alphabet",
		interfaces: [nodeInterface],
		fields: {
			id: globalIdField(),
			letter: {
				type: GraphQLString,
			},
		},
	});

	const { connectionType: alphabetConnection } = connectionDefinitions({
		name: "Alphabet",
		nodeType: AlphabetType,
	});

	return new GraphQLSchema({
		directives: [GraphQLDeferDirective, GraphQLStreamDirective, ...specifiedDirectives],
		query: new GraphQLObjectType({
			name: "Query",
			fields: () => ({
				node: nodeField,
				alphabet: {
					args: connectionArgs,
					type: alphabetConnection,
					resolve: async (_source, args) => {
						const result = connectionFromArray(alphabet, args);
						return {
							pageInfo: async () => {
								await new Promise((resolve) => setTimeout(resolve, 500));
								return result.pageInfo;
							},
							edges: async function* () {
								for (const edge of result.edges) {
									yield edge;
									await new Promise((resolve) => setTimeout(resolve, 500));
								}
							},
						};
					},
				},
				fastField: {
					type: new GraphQLNonNull(GraphQLString),
					resolve: () => "Fast Field!",
				},
				slowField: {
					type: new GraphQLNonNull(GraphQLString),
					resolve: async () => {
						await new Promise((resolve) => setTimeout(resolve, 1200));
						return "Slow Field!";
					},
				},
			}),
		}),
	});
}

const outputPath = path.join(import.meta.dirname, "../../../", "schema.graphql");

writeFileSync(outputPath, printSchema(getSchema()));

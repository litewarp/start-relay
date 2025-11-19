import { setTimeout as setTimeout$ } from "node:timers/promises";
import { useDeferStream } from "@graphql-yoga/plugin-defer-stream";
import { connectionFromArray } from "graphql-relay";
import { createSchema, createYoga, Repeater } from "graphql-yoga";
import { alphabet } from "./alphabet.ts";
import { getSchema } from "./schema.ts";

// const typeDefs = /* GraphQL */ `
//   type Letter {
//     value: String!
//     id: ID!
//   }

// 	type Query {
// 	  alphabet: [Letter!]!

// 		fastField: String!

// 		slowField(waitFor: Int! = 5000): String
// 	}
// `;

const yoga = createYoga({
	graphiql: true,
	graphqlEndpoint: "/api/graphql",
	fetchAPI: { Response },
	// biome-ignore lint/correctness/useHookAtTopLevel: turtle
	plugins: [useDeferStream()],
	logging: "debug",
	schema: getSchema(),
	// // schema: createSchema({
	// // 	typeDefs,
	// // 	resolvers: {
	// // 		Query: {
	// // 			alphabet: (_, args) =>
	// // 				new Repeater<{ letter: string; id: string }>(async (push, stop) => {
	// // 					const values = alphabet;
	// // 					const publish = () => {
	// // 						const value = values.shift();
	// // 						console.log("publish", value);

	// // 						if (value) {
	// // 							push(value);
	// // 						}

	// // 						if (values.length === 0) {
	// // 							stop();
	// // 						}
	// // 					};
	// // 					const interval = setInterval(publish, 1000);
	// // 					publish();

	// // 					await stop.then(() => {
	// // 						console.log("cancel");
	// // 						clearInterval(interval);
	// // 					});
	// // 				}),
	// // 			fastField: async () => {
	// // 				await setTimeout$(100);
	// // 				return "I am speed";
	// // 			},
	// // 			slowField: async (_, { waitFor }) => {
	// // 				await setTimeout$(waitFor);
	// // 				return "I am slow";
	// // 			},
	// // 		},
	// // 	},
	// }),
});

export async function handler<T extends object>({
	request,
	context,
}: {
	request: Request;
	context: T;
}) {
	const res = await yoga.handleRequest(request, context);
	return res;
}

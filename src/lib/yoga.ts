import { setTimeout as setTimeout$ } from "node:timers/promises";
import { createSchema, createYoga, Repeater } from "graphql-yoga";

const typeDefs = /* GraphQL */ `
	type Query {
	  alphabet: [String!]!

		fastField: String!

		slowField(waitFor: Int! = 5000): String
	}
`;

export const yoga = createYoga({
	graphiql: true,
	graphqlEndpoint: "/api/graphql",
	fetchAPI: { Response },
	schema: createSchema({
		typeDefs,
		resolvers: {
			Query: {
				alphabet: () =>
					new Repeater<string>(async (push, stop) => {
						const values = alphabet;
						const publish = () => {
							const value = values.shift();
							console.log("publish", value);

							if (value) {
								push(value);
							}

							if (values.length === 0) {
								stop();
							}
						};
						const interval = setInterval(publish, 1000);
						publish();

						await stop.then(() => {
							console.log("cancel");
							clearInterval(interval);
						});
					}),
				fastField: async () => {
					await setTimeout$(100);
					return "I am speed";
				},
				slowField: async (_, { waitFor }) => {
					await setTimeout$(waitFor);
					return "I am slow";
				},
			},
		},
	}),
});

const alphabet = [
	"a",
	"b",
	"c",
	"d",
	"e",
	"f",
	"g",
	"h",
	"i",
	"j",
	"k",
	"l",
	"m",
	"n",
	"o",
	"p",
	"q",
	"r",
	"s",
	"t",
	"u",
	"v",
	"w",
	"x",
	"y",
	"z",
];

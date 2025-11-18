import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import relay from "react-relay";
import type { relayFragment$key } from "~relay/relayFragment.graphql.ts";
import node, { type relayPageQuery } from "~relay/relayPageQuery.graphql.ts";

const { graphql, useLazyLoadQuery, useFragment } = relay;

const query = graphql`
    query relayPageQuery {
        fastField
        ...relayFragment @defer(if: true)
    }
  `;

export const Route = createFileRoute("/relay")({
	loader: async ({ context }) => {
		await context.preloadQuery(node, {});
	},
	component: RouteComponent,
});

function RouteComponent() {
	const data = useLazyLoadQuery<relayPageQuery>(
		query,
		{},
		{
			fetchPolicy: "store-or-network",
			UNSTABLE_renderPolicy: "partial",
		},
	);

	return (
		<div className="flex flex-col p-8 gap-y-2">
			<h1 className="text-2xl font-bold">Tanstack Start Relay Integration</h1>
			<p>This page demonstrates the use of the @defer directive in Relay</p>
			<div className="p-4 flex flex-col">
				<h2 className="text-lg underline">Fast Field</h2>
				<p>{data.fastField}</p>
			</div>
			<div className="p-4 flex flex-col">
				<h2 className="text-lg underline">Slow Field</h2>
				<Suspense fallback={<div>Loading...</div>}>
					<AlphaFragment query={data} />
				</Suspense>
			</div>{" "}
		</div>
	);
}

function AlphaFragment(props: { query: relayFragment$key }) {
	const data = useFragment(
		graphql`
    fragment relayFragment on Query {
        slowField(waitFor: 5000)
    }
  `,
		props.query,
	);

	return <>{data.slowField}</>;
}

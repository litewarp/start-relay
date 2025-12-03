import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import relay from 'react-relay';
import type { deferFastFragment$key } from '~relay/deferFastFragment.graphql.ts';
import { type deferPageQuery } from '~relay/deferPageQuery.graphql.ts';
import type { deferSlowFragment$key } from '~relay/deferSlowFragment.graphql.ts';

const { graphql, useLazyLoadQuery, useFragment } = relay;

const query = graphql`
  query deferPageQuery {
    ...deferFastFragment
    ...deferSlowFragment @defer(if: true)
  }
`;

export const Route = createFileRoute('/defer')({
  loader: ({ context }) => {
    return context.preloadQuery(query, {});
  },
  component: RouteComponent,
});

function RouteComponent() {
  const data = useLazyLoadQuery<deferPageQuery>(query, {}, {});

  return (
    <div className="flex flex-col p-8 gap-y-2">
      <h1 className="text-2xl font-bold">Tanstack Start Relay Integration</h1>
      <p>This page demonstrates the use of the @defer directive in Relay</p>
      <div className="p-4 flex flex-col">
        <h2 className="text-lg underline">Fast Field</h2>
        <Suspense fallback={<>Loading fastField ...</>}>
          <FastFragment query={data} />
        </Suspense>
      </div>
      <div className="p-4 flex flex-col">
        <h2 className="text-lg underline">Slow Field</h2>
        <Suspense fallback={<div>Loading...</div>}>
          <AlphaFragment query={data} />
        </Suspense>
      </div>{' '}
    </div>
  );
}

function FastFragment(props: { query: deferFastFragment$key }) {
  const data = useFragment(
    graphql`
      fragment deferFastFragment on Query {
        fastField
      }
    `,
    props.query,
  );

  return <>{data.fastField}</>;
}

function AlphaFragment(props: { query: deferSlowFragment$key }) {
  const data = useFragment(
    graphql`
      fragment deferSlowFragment on Query {
        slowField(waitFor: 5000)
      }
    `,
    props.query,
  );

  return <>{data.slowField}</>;
}

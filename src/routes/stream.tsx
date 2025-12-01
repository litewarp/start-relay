import { createFileRoute } from '@tanstack/react-router';
import relay from 'react-relay';
import { type streamQuery } from '~relay/streamQuery.graphql.ts';
import type { streamAlphabet_Query$key } from '~relay/streamAlphabet_Query.graphql.ts';
import { Suspense } from 'react';

const { useLazyLoadQuery, graphql, useFragment } = relay;

const query = graphql`
  query streamQuery {
    ...streamAlphabet_Query
  }
`;

export const Route = createFileRoute('/stream')({
  loader: async ({ context }) => {
    context.preloadQuery(query, {});
  },
  component: RouteComponent,
});

function RouteComponent() {
  const data = useLazyLoadQuery<streamQuery>(query, {});
  return (
    <div>
      <h2>Alphabet Letters</h2>
      <Suspense fallback={<>Loading...</>}>
        <AlphabetComponent queryKey={data} />
      </Suspense>
    </div>
  );
}

function AlphabetComponent(props: { queryKey: streamAlphabet_Query$key }) {
  const query = useFragment(
    graphql`
      fragment streamAlphabet_Query on Query {
        alphabet(first: 10) @stream_connection(key: "stream_alphabet", initial_count: 0) {
          edges {
            cursor
            node {
              id
              letter
            }
          }
        }
      }
    `,
    props.queryKey,
  );

  const edges = query.alphabet?.edges ?? [];

  return (
    <div>
      {edges.map((edge, index) => (
        <div key={edge?.cursor ?? `index_${index}`}>
          {edge?.node ? <>{edge.node.letter}</> : null}
        </div>
      ))}
    </div>
  );
}

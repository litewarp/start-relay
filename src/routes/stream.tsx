import { createFileRoute } from '@tanstack/react-router';
import relay from 'react-relay';
import node, { type streamQuery } from '~relay/streamQuery.graphql.ts';
import { Suspense, lazy } from 'react';

const { useLazyLoadQuery, graphql } = relay;
const LetterComponent = lazy(() => import('~/components/Letter.tsx'));

const query = graphql`
  query streamQuery($count: Int!, $cursor: String) {
    alphabet(first: $count, after: $cursor)
      @stream_connection(key: "stream_alphabet", initial_count: 2) {
      edges {
        cursor
        ...LetterFragment
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const Route = createFileRoute('/stream')({
  loader: async ({ context }) => {
    context.preloadQuery(node, { count: 10, cursor: null }, {});
  },
  component: RouteComponent,
});

function RouteComponent() {
  const data = useLazyLoadQuery<streamQuery>(query, { count: 10, cursor: null });
  const edges = data.alphabet?.edges ?? [];
  return (
    <div>
      <Suspense fallback={'alpha boundary'}>
        {edges.map((edge) => (
          <Suspense fallback={'Loading ...'} key={edge?.cursor}>
            {edge ? <LetterComponent queryKey={edge} /> : null}
          </Suspense>
        ))}
      </Suspense>
    </div>
  );
}

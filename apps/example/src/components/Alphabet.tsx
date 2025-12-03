import relay from 'react-relay';
const { graphql, usePaginationFragment } = relay;
import { Suspense, lazy } from 'react';
import type { AlphabetFragment$key } from '~relay/AlphabetFragment.graphql.ts';

const LetterEdgeComponent = lazy(() => import('./Letter.tsx'));

const fragment = graphql`
  fragment AlphabetFragment on Language
  @refetchable(queryName: "streamLanguageAlphabetQuery")
  @argumentDefinitions(count: { type: "Int" }, cursor: { type: "String" }) {
    alphabet(first: $count, after: $cursor)
      @stream_connection(key: "language_alphabet", initial_count: 2) {
      edges {
        cursor
        ...LetterFragment
      }
    }
  }
`;

function AlphabetComponent(props: { queryKey: AlphabetFragment$key }) {
  const {
    data,
    loadNext,
    loadPrevious,
    hasNext,
    hasPrevious,
    isLoadingNext,
    isLoadingPrevious,
    refetch, // For refetching connection
  } = usePaginationFragment(fragment, props.queryKey);

  const edges = data?.alphabet?.edges || [];

  return (
    <div>
      {edges.map((edge) =>
        edge ? (
          <Suspense fallback={<>Loading ...</>} key={edge.cursor}>
            {edge ? <LetterEdgeComponent key={edge.cursor} queryKey={edge} /> : null}
          </Suspense>
        ) : (
          <>Nothing?</>
        ),
      )}
      {hasNext && <button onClick={() => loadNext(10)}>Load More</button>}
    </div>
  );
}

export default AlphabetComponent;

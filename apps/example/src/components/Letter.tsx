import relay from 'react-relay';
import type { LetterFragment$key } from '~relay/LetterFragment.graphql.ts';
const { useFragment, graphql } = relay;

const fragment2 = graphql`
  fragment LetterFragment on AlphabetEdge {
    node @required(action: THROW) {
      id
      letter
    }
  }
`;

function LetterComponent(props: { queryKey: LetterFragment$key }) {
  const data = useFragment(fragment2, props.queryKey);

  return (
    <div>
      {data.node.id} - {data.node.letter}
    </div>
  );
}
export default LetterComponent;

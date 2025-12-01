import type {
  InitialIncrementalExecutionResult,
  SubsequentIncrementalExecutionResult,
} from 'graphql';

const response1: InitialIncrementalExecutionResult = {
  data: {
    alphabet: {
      edges: [
        {
          cursor: 'YXJyYXljb25uZWN0aW9uOjA=',
          node: {
            id: 'QWxwaGFiZXQ6MQ==',
            letter: 'a',
            __typename: 'Alphabet',
          },
        },
        {
          cursor: 'YXJyYXljb25uZWN0aW9uOjE=',
          node: {
            id: 'QWxwaGFiZXQ6Mg==',
            letter: 'b',
            __typename: 'Alphabet',
          },
        },
      ],
    },
  },
  pending: [
    {
      id: '0',
      path: ['alphabet', 'edges'],
      label: 'streamQuery$stream$stream_alphabet',
    },
    {
      id: '1',
      path: ['alphabet'],
      label: 'streamQuery$defer$stream_alphabet$pageInfo',
    },
  ],
  hasNext: true,
};

const response2: SubsequentIncrementalExecutionResult = {
  hasNext: true,
  incremental: [
    {
      data: {
        pageInfo: {
          hasNextPage: true,
          endCursor: 'YXJyYXljb25uZWN0aW9uOjk=',
        },
      },
      id: '1',
    },
  ],
  completed: [
    {
      id: '1',
    },
  ],
};

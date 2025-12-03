import { graphqlHandler } from '~/lib/server-graphql/handler.ts';

import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/graphql')({
  server: {
    handlers: {
      GET: graphqlHandler,
      POST: graphqlHandler,
    },
  },
});

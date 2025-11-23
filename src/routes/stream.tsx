import { createFileRoute } from '@tanstack/react-router';
import { graphql, useFragment, useLazyLoadQuery } from 'react-relay';

export const Route = createFileRoute('/stream')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/stream"!</div>;
}

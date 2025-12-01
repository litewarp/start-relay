import { createFileRoute, Link } from '@tanstack/react-router';
export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <div className="flex flex-col p-8 gap-y-2">
      <h1 className="text-2xl font-bold">Tanstack Start Relay Integration</h1>
      <p>
        Navigate to{' '}
        <Link className="text-blue-500 hover:underline" to="/defer">
          /defer
        </Link>{' '}
        or{' '}
        <Link className="text-blue-500 hover:underline" to="/stream">
          /stream
        </Link>{' '}
        to explore the integration.
      </p>
    </div>
  );
}

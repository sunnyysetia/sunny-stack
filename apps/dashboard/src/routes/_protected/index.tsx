import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_protected/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext(); // Available because of layout route
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-2xl font-semibold text-zinc-900">Home</h1>
      <p className="text-sm text-zinc-500">
        Welcome back, {session.user.name || session.user.email}.
      </p>
    </div>
  );
}

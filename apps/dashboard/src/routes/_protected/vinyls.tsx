import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_protected/vinyls')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-2xl font-semibold text-zinc-900">Vinyls</h1>
      <p className="text-sm text-zinc-500">Your record collection lives here.</p>
    </div>
  );
}

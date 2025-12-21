import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { sessionQueryOptions } from '@/features/auth/api/queries';

export const Route = createFileRoute('/_auth')({
  component: RouteComponent,
  validateSearch: z.object({
    redirect: z.string().optional().catch(''),
  }),
  beforeLoad: async ({ context: { queryClient }, search }) => {
    const session = await queryClient.ensureQueryData(sessionQueryOptions);
    if (session) {
      throw redirect({ to: search.redirect || '/' });
    }
  },
});

function RouteComponent() {
  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-[#FBFAF9]">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 shadow-xs">
        <Outlet />
      </div>
    </div>
  );
}

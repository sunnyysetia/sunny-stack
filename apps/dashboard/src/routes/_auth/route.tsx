import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { sessionQueryOptions } from '@/features/auth/api/queries';
import { normalizeRedirectTarget } from '@/features/auth/lib/redirect';

export const Route = createFileRoute('/_auth')({
  component: RouteComponent,
  validateSearch: z.object({
    redirect: z.string().optional().catch(''),
  }),
  beforeLoad: async ({ context: { queryClient }, search }) => {
    const session = await queryClient.ensureQueryData(sessionQueryOptions);
    if (session) {
      // `href` (not `to`): the target can carry a query string/hash, which
      // TanStack won't parse out of a `to` pathname template. Sanitised so a
      // crafted `?redirect=` can't become an open redirect.
      throw redirect({ href: normalizeRedirectTarget(search.redirect) });
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

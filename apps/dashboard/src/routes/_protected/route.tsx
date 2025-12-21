import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { sessionQueryOptions } from '@/features/auth/api/queries';

export const Route = createFileRoute('/_protected')({
  component: RouteComponent,
  beforeLoad: async ({ context: { queryClient } }) => {
    const session = await queryClient.ensureQueryData(sessionQueryOptions);
    if (!session) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } });
    }
    return { session };
  },
});

function RouteComponent() {
  return <Outlet />;
}

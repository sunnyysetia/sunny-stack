import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { sessionQueryOptions } from '@/features/auth/api/queries';
import { captureReturnTo } from '@/features/auth/lib/redirect';
import { AppSidebar } from '@/features/sidebar/components/app-sidebar';

export const Route = createFileRoute('/_protected')({
  component: RouteComponent,
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const session = await queryClient.ensureQueryData(sessionQueryOptions);
    if (!session) {
      // Capture where they were heading as a safe relative path so we return
      // them there after sign-in (never an absolute href → no open redirect).
      throw redirect({ to: '/sign-in', search: { redirect: captureReturnTo(location) } });
    }
    return { session };
  },
});

function RouteComponent() {
  return (
    <div className="flex h-screen flex-col bg-[#EEEEE9]">
      <div className="flex flex-1 overflow-hidden py-3">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-hidden rounded-2xl bg-white">
            <div className="h-full overflow-y-auto px-6 py-4">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

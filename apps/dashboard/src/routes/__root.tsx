import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, Outlet, useNavigate } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { useEffect } from 'react';
import { Toaster } from 'sonner';

import type { trpcClient } from '@/api/trpc';

export interface AppRouterContext {
  queryClient: QueryClient;
  trpcClient: typeof trpcClient;
}

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster position="top-center" richColors />
      {import.meta.env.DEV && (
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            {
              name: 'Tanstack Query',
              render: <ReactQueryDevtoolsPanel />,
            },
          ]}
        />
      )}
    </>
  );
}

/**
 * Catch-all for any URL the router doesn't recognise — including stale emailed
 * links still sitting in mailboxes and leftover `/?error=…` tabs. Rather than a
 * dead 404, resolve to a clean entry point: `replace` so the dead URL (and any
 * token/error param on it) doesn't linger in history, then let the `_auth` /
 * `_protected` guards route authed vs. unauthenticated correctly.
 */
function NotFound() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: '/sign-in', replace: true });
  }, [navigate]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#FBFAF9] p-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-xs">
        <p className="text-sm text-zinc-600">
          That link has expired or no longer exists. One moment…
        </p>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFound,
});

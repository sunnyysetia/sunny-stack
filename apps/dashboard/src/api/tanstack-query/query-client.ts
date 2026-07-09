import { QueryClient } from '@tanstack/react-query';

// Dashboard-wide react-query defaults.
//
// staleTime is short by design: the client cache is for de-duping rapid
// navigation, not for hiding expensive server work. A 60s window is enough —
// refocusing the tab triggers a background refetch rather than serving
// hours-old data, and a longer window would make stale data linger past tab
// switches.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: true,
      gcTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

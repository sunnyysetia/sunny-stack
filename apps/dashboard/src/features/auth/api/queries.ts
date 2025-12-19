import { queryOptions } from '@tanstack/react-query';

import { authClient } from '@/api/better-auth/client';

// query keys
export const AUTH_QUERY_KEYS = {
  all: ['auth'],
  session: () => [...AUTH_QUERY_KEYS.all, 'session'],
} as const;

export const sessionQueryOptions = queryOptions({
  queryKey: AUTH_QUERY_KEYS.session(),
  queryFn: async () => {
    const { data } = await authClient.getSession();
    return data ?? null;
  },
  staleTime: 30_000,
});

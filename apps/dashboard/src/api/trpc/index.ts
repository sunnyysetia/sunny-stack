import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

import { env } from '@/env';

import type { AppRouter } from '../../../../api/src/trpc/public'; // type-only import from api

const url = `${env.VITE_API_BASE_URL}/trpc`;

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url,
      transformer: superjson, // matches server-side transformer
      fetch(input, init) {
        return fetch(input, { ...init, credentials: 'include' });
      },
    }),
  ],
});

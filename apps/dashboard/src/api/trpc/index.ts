import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import superjson from 'superjson';
import { queryClient } from '../tanstack-query';
import type { AppRouter } from '../../../../api/src/trpc/public'; // type-only export from api

// 1) RAW tRPC CLIENT
// - This is the "callable" client.
// - Use this when you want to directly invoke procedures:
//   await trpcClient.books.listPublic.query()
//   await trpcClient.books.create.mutate({ ... })
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:8000/trpc',
      transformer: superjson, // matches server-side transformer
    }),
  ],
});

// 2) tRPC -> TanStack Query OPTIONS PROXY
// - This is NOT callable.
// - It produces React Query options (queryKey/queryFn/etc) for each procedure.
// - Use this with queryClient / useQuery / loaders:
//   queryClient.fetchQuery(trpc.books.listPublic.queryOptions())
//   useQuery(trpc.books.listPublic.queryOptions())
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});

import { queryOptions } from '@tanstack/react-query';

import { trpcClient } from '@/api/trpc';

export const BOOK_QUERY_KEYS = {
  all: ['books'],
  list: () => [...BOOK_QUERY_KEYS.all, 'list'],
} as const;

export const booksQueryOptions = () =>
  queryOptions({
    queryKey: BOOK_QUERY_KEYS.list(),
    queryFn: async () => {
      const books = await trpcClient.books.listProtected.query();
      return books;
    },
  });

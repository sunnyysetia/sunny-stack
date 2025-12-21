import { booksRouter } from '@/modules/books/trpc/books.router';

import { router } from './trpc';

export const appRouter = router({
  books: booksRouter,
  // users: usersRouter,
});

export type AppRouter = typeof appRouter;

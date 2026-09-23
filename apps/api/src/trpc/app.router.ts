import { booksRouter } from '@/modules/books/trpc/books.router.js';

import { router } from './trpc.js';

export const appRouter = router({
  books: booksRouter,
  // users: usersRouter,
});

export type AppRouter = typeof appRouter;

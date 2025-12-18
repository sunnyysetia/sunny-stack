import { router } from '@/trpc/trpc';
import { booksRouter } from '@/modules/books/trpc/books.router';

export const appRouter = router({
  books: booksRouter,
  //   users: usersRouter,
});

export type AppRouter = typeof appRouter;

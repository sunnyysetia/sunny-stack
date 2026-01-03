import { z } from 'zod';

import { book, isDbError } from '@/core/database';
import { throwAppError } from '@/trpc/error';
import { protectedProcedure, publicProcedure, router } from '@/trpc/trpc';

export const booksRouter = router({
  // anyone can call this
  listPublic: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.book.findMany();
  }),

  // only logged-in users can call this
  listProtected: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.book.findMany();
  }),
  create: protectedProcedure
    .input(z.object({ title: z.string().min(1), publishedAt: z.coerce.date() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [newBook] = await ctx.db
          .insert(book)
          .values({ title: input.title, publishedAt: input.publishedAt })
          .returning();

        return newBook;
      } catch (error) {
        if (isDbError(error, 'UNIQUE_CONSTRAINT')) {
          throwAppError({
            trpcCode: 'BAD_REQUEST',
            appCode: 'BOOK_TITLE_TAKEN',
            message: 'Book title already taken',
            field: 'title',
          });
        }
        throw error;
      }
    }),
});

import { bookTable, isDbError } from '@/core/database';
import { throwAppError } from '@/trpc/error';
import { protectedProcedure, publicProcedure, router } from '@/trpc/trpc';

import { createBookSchema } from '../books.schemas';

export const booksRouter = router({
  // anyone can call this
  listPublic: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(bookTable);
  }),

  // only logged-in users can call this
  listProtected: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(bookTable);
  }),
  create: protectedProcedure
    // Same schema the REST controller's `@Body({ schema })` uses.
    .input(createBookSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const [newBook] = await ctx.db
          .insert(bookTable)
          .values({ title: input.title, status: input.status, publishedAt: input.publishedAt })
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

import { exampleStatusSchema } from '@repo/schemas';
import { z } from 'zod';

import { bookTable, isDbError } from '@/core/database';
import { throwAppError } from '@/trpc/error';
import { protectedProcedure, publicProcedure, router } from '@/trpc/trpc';

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
    // `status` reuses the SAME `@repo/schemas` source that defines the pg enum,
    // so the API's input validation and the DB constraint stay in lockstep.
    .input(
      z.object({
        title: z.string().min(1),
        publishedAt: z.coerce.date(),
        status: exampleStatusSchema.optional(),
      }),
    )
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

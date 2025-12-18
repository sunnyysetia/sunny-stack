import { book } from '@/core/database/schema/book';
import { protectedProcedure, publicProcedure, router } from '@/trpc/trpc';
import { z } from 'zod';

export const booksRouter = router({
  // anyone can call this
  listPublic: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.book.findMany();
  }),

  // only logged-in users can call this
  create: protectedProcedure
    .input(z.object({ title: z.string().min(1), publishedAt: z.coerce.date() }))
    .mutation(async ({ ctx, input }) => {
      const [newBook] = await ctx.db
        .insert(book)
        .values({ title: input.title, publishedAt: input.publishedAt })
        .returning();

      return newBook;
    }),
});

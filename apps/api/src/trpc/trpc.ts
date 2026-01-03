import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { z, ZodError } from 'zod';

import type { TrpcContext } from './context.factory';
import { AppError } from './error';

export const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const cause = error.cause;

    return {
      ...shape,
      data: {
        ...shape.data,

        // Zod validation errors, inferred to client
        zodError:
          error.code === 'BAD_REQUEST' && cause instanceof ZodError ? z.flattenError(cause) : null,

        // Your app semantic errors, inferred to client
        appCode: cause instanceof AppError ? cause.appCode : null,
        field: cause instanceof AppError ? cause.field : null,
      },
    };
  },
});

export const router = t.router;

// Auth middleware
const requireUser = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Login required' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session,
    },
  });
});

// Procedures
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(requireUser);

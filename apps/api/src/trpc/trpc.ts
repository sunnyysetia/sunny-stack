import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';

import type { TrpcContext } from './context.factory';

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
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

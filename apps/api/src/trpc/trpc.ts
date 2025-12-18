import { initTRPC, TRPCError } from '@trpc/server';
import type { TrpcContext } from './trpc-context.factory';
import superjson from 'superjson';

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

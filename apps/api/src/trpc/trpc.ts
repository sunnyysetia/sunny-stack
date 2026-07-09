import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { z, ZodError } from 'zod';

import { getLogger } from '@/core/logging';

import type { TrpcContext } from './context.factory';
import { AppError } from './error';

const trpcLogger = getLogger('Trpc');

export const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const cause = error.cause;

    return {
      ...shape,
      data: {
        ...shape.data,

        // Zod validation errors, inferred to the client.
        zodError:
          error.code === 'BAD_REQUEST' && cause instanceof ZodError ? z.flattenError(cause) : null,

        // App semantic errors, inferred to the client.
        appCode: cause instanceof AppError ? cause.appCode : null,
        field: cause instanceof AppError ? cause.field : null,
        appData: cause instanceof AppError ? (cause.data ?? null) : null,
      },
    };
  },
});

export const router = t.router;

// ── Middleware-to-procedure pipeline ──────────────────────────────────
//
// We inline middlewares directly on the procedure builder instead of
// defining them separately with `t.middleware()`. That matters for type
// narrowing: standalone `t.middleware()` callbacks are bound to the base
// context, so they cannot "see" upstream narrowings (e.g. a `requireUser`
// middleware narrows `user` to non-null, but a downstream middleware that
// spreads `...ctx` falls back to the base `user: AppAuthUser | null`).
//
// Two rules keep the narrowings flowing through the chain:
//   1. Define auth middlewares inline with `.use(({ ctx, next }) => …)` so
//      tRPC infers the output context type directly from the callback's
//      `next({ ctx })` call.
//   2. In every middleware, return **only the new fields** — e.g.
//      `next({ ctx: { orgId } })`. Do NOT spread `...ctx`: tRPC merges the
//      new fields into the already-narrowed chain context, and a respread
//      would clobber the narrowing with the base context type.
// ──────────────────────────────────────────────────────────────────────

// Per-procedure observability middleware. Emits one structured "wide event"
// per call. Mutations are the state-changing actions worth a routine line;
// queries stay quiet unless they error. Inputs/outputs are deliberately NOT
// logged (noise + PII).
const logger = t.middleware(async ({ path, type, ctx, next }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;
  const fields = {
    path,
    type,
    userId: ctx.user?.id ?? undefined,
    orgId: ctx.orgId ?? undefined,
    durationMs,
  };
  if (!result.ok) {
    trpcLogger.warn({ ...fields, outcome: 'error' }, 'trpc error');
  } else if (type !== 'query') {
    trpcLogger.info({ ...fields, outcome: 'ok' }, 'trpc ok');
  }
  return result;
});

export const publicProcedure = t.procedure.use(logger);

export const protectedProcedure = t.procedure.use(logger).use(({ ctx, next }) => {
  const { user, session } = ctx;
  if (!user || !session) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Login required' });
  }
  return next({ ctx: { user, session } });
});

// Requires an active organization (the caller has selected one via
// `organization.setActive`). Chained inline so `ctx.orgId` narrows to `string`
// for everything built on top.
export const orgProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.orgId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'No active organisation' });
  }
  return next({ ctx: { orgId: ctx.orgId } });
});

// Requires org admin/owner rights in the active org. Authorizes via better-auth's
// permission API — the idiomatic check: it reads the caller's role from the
// session and works with custom/dynamic roles, unlike a hard-coded
// `role === 'admin'`. `member: ['create']` is granted to owner + admin by the
// default roles; swap the permission to gate other tiers (e.g.
// `organization: ['delete']` for owner-only). See the organization plugin's
// access-control docs to define custom roles/permissions.
export const orgAdminProcedure = orgProcedure.use(async ({ ctx, next }) => {
  const { success } = await ctx.auth.api.hasPermission({
    headers: ctx.authHeaders,
    body: { permissions: { member: ['create'] } },
  });
  if (!success) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Organisation admin access required' });
  }
  return next();
});

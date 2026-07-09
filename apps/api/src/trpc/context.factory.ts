import { Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import { AuthSessionService } from '@/core/auth/auth-session.service';
import type { AppAuth, AppAuthSession, AppAuthUser } from '@/core/auth/better-auth';
import { BETTER_AUTH } from '@/core/auth/better-auth';
import { type Database, DB_CONNECTION } from '@/core/database';

// The tRPC request context. One better-auth `getSession` per request (the
// session cookie is cookie-cached, so this is cheap), plus `db` and the auth
// instance/headers so routers and procedures can call `auth.api.*`.
//
// Roles are NOT resolved eagerly here: `user.role` (admin plugin) and
// `session.activeOrganizationId` (organization plugin) already ride on the
// session, and authorization is done at the call site via `auth.api.hasPermission`
// (see `orgAdminProcedure` in trpc.ts). That keeps every request to a single
// session read and works with custom/dynamic roles.
//
// CONVENTION (domain-grouped context): as you add domains, inject their services
// here and group them onto sub-contexts, e.g. `ctx.billing.invoices`,
// `ctx.catalog.items`. Grouping by domain keeps the module boundary visible at
// each router call site. The reference `books` router reads `ctx.db` directly;
// larger domains should go through a service.
export type TrpcContext = {
  db: Database;

  session: AppAuthSession | null; // includes `activeOrganizationId` (organization plugin)
  user: AppAuthUser | null; // includes `role` / `banned` (admin plugin)

  // Convenience: the caller's active organization id, lifted off the session.
  orgId: string | null;

  // The better-auth instance + this request's headers (as Web `Headers`), for
  // routers/procedures that call `auth.api.*` (permission checks, org/admin
  // management).
  auth: AppAuth;
  authHeaders: Headers;
};

@Injectable()
export class TrpcContextFactory {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: Database,
    @Inject(BETTER_AUTH) private readonly auth: AppAuth,
    private readonly authSession: AuthSessionService,
  ) {}

  async create(req: Request): Promise<TrpcContext> {
    const authHeaders = await this.authSession.toWebHeaders(req);
    const result = await this.authSession.getSession(authHeaders);

    return {
      db: this.db,

      session: result?.session ?? null,
      user: result?.user ?? null,
      orgId: result?.session.activeOrganizationId ?? null,

      auth: this.auth,
      authHeaders,
    };
  }
}

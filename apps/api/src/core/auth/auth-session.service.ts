import { Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import { type AppAuth, BETTER_AUTH } from './better-auth';

// Thin wrapper around better-auth's server-side session API — the single place
// that converts Express headers to Web `Headers` and calls `auth.api.getSession`,
// so the tRPC context factory and any controller share one implementation.
//
// Role/permission checks are deliberately NOT done here: `session.activeOrganizationId`
// (organization plugin) and `user.role` (admin plugin) ride on the session, and
// authorization happens at the call site via `auth.api.hasPermission` /
// `userHasPermission` (see the org procedures in trpc.ts). That keeps every
// request to a single session read.
@Injectable()
export class AuthSessionService {
  constructor(@Inject(BETTER_AUTH) private readonly auth: AppAuth) {}

  // Express `IncomingHttpHeaders` -> Web `Headers`, the shape every `auth.api.*`
  // method expects. `better-auth/node` is ESM-only and the runtime is CJS, so
  // dynamic-import (Node caches the module, so this is one resolution).
  async toWebHeaders(req: Request): Promise<Headers> {
    const { fromNodeHeaders } = await import('better-auth/node');
    return fromNodeHeaders(req.headers);
  }

  // Resolves the better-auth session + user, or null when unauthenticated.
  getSession(headers: Headers) {
    return this.auth.api.getSession({ headers });
  }
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import type { AppAuthSession, AppAuthUser } from '../better-auth';
import {
  IS_PUBLIC_ROUTE_KEY,
  IS_SERVICE_ROUTE_KEY,
  IS_USER_ROUTE_KEY,
} from '../decorators/route.decorator';

import {
  type AuthStrategy,
  INTERNAL_AUTH_STRATEGY,
  USER_AUTH_STRATEGY,
} from './strategies/auth-strategy.interface';

export interface AuthGuardRequest extends Request {
  headers: Record<string, string | string[] | undefined>;
  session?: AppAuthSession;
  user?: AppAuthUser;
}

// Global guard (registered via APP_GUARD in app.module). Dispatches on the
// route's access-level decorator and delegates to the matching strategy.
// A route with NO access-level decorator is denied — fail-closed, so
// forgetting to annotate a new controller never accidentally exposes it.
//
// Note: this guards NestJS controller routes only. tRPC is express-mounted
// and enforces auth via its own procedures (protectedProcedure etc.).
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(INTERNAL_AUTH_STRATEGY) private readonly internalStrategy: AuthStrategy,
    @Inject(USER_AUTH_STRATEGY) private readonly userAuthStrategy: AuthStrategy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    // 1. Public — no auth required
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE_KEY, targets);
    if (isPublic) return true;

    // 2. Service — delegate to API key strategy
    const isService = this.reflector.getAllAndOverride<boolean>(IS_SERVICE_ROUTE_KEY, targets);
    if (isService) return this.internalStrategy.validate(context);

    // 3. User auth — delegate to session strategy
    const isUserRoute = this.reflector.getAllAndOverride<boolean>(IS_USER_ROUTE_KEY, targets);
    if (isUserRoute) return this.userAuthStrategy.validate(context);

    // No access level specified — deny by default
    throw new ForbiddenException('No access level specified');
  }
}

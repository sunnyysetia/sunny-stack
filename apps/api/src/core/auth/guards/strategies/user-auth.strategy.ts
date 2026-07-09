import type { ExecutionContext } from '@nestjs/common';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import { type AppAuth, BETTER_AUTH } from '@/core/auth/better-auth';

import type { AuthGuardRequest } from '../auth.guard';

import type { AuthStrategy } from './auth-strategy.interface';

// User-session auth: resolves the better-auth session from the request
// cookies/headers and attaches `session` + `user` to the request for
// downstream controller handlers to read.
@Injectable()
export class UserAuthStrategy implements AuthStrategy {
  constructor(@Inject(BETTER_AUTH) private readonly betterAuth: AppAuth) {}

  async validate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthGuardRequest>();

    // Build Web Headers from Express headers (the shape better-auth expects).
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value == null) continue;
      headers.append(key, Array.isArray(value) ? value.join(', ') : value);
    }

    const sessionResult = await this.betterAuth.api.getSession({ headers });

    if (!sessionResult?.session) {
      throw new UnauthorizedException('Authentication required');
    }

    request.session = sessionResult.session;
    request.user = sessionResult.user;

    return true;
  }
}

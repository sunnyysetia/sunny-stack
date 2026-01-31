import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Session, User } from 'better-auth';
import type { Request } from 'express';

import { type Auth, BETTER_AUTH } from '@/core/auth/better-auth';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export interface AuthGuardRequest extends Request {
  headers: Record<string, string | string[] | undefined>;
  session?: Session;
  user?: User;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(BETTER_AUTH) private readonly betterAuth: Auth,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check if Public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 2. Get Request
    const request = context.switchToHttp().getRequest<AuthGuardRequest>();

    // 3. Build Headers from Express headers
    const headers = new Headers();
    const rawHeaders = request.headers;

    for (const [key, value] of Object.entries(rawHeaders)) {
      if (value == null) continue;
      headers.append(key, Array.isArray(value) ? value.join(', ') : value);
    }

    // 4. Get Session
    const sessionResult = await this.betterAuth.api.getSession({
      headers,
    });

    if (!sessionResult?.session) {
      throw new UnauthorizedException('Authentication required');
    }

    // 5. Attach Session and User to Request
    request.session = sessionResult.session;
    request.user = sessionResult.user;

    // 6. Allow Request
    return true;
  }
}

import { timingSafeEqual } from 'node:crypto';
import type { ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';

import { env } from '@/config/env';

import type { AuthGuardRequest } from '../auth.guard';

import type { AuthStrategy } from './auth-strategy.interface';

// Constant-time compare so a caller can't time-probe the expected key. Bails
// on length mismatch first (timingSafeEqual throws on unequal-length buffers).
function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

// Service-to-service auth: validates the `x-service-api-key` header against
// INTERNAL_API_KEY. Used by @ServiceRoute handlers (internal callers, cron
// runners, other backend services) that don't carry a user session.
@Injectable()
export class InternalAuthStrategy implements AuthStrategy {
  validate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthGuardRequest>();
    const key = request.headers['x-service-api-key'];

    if (!key || typeof key !== 'string') {
      throw new UnauthorizedException('Missing internal API key');
    }

    // Read the expected key LAZILY (INTERNAL_API_KEY is optional at boot, so
    // the app runs without it — mirrors the Storage/Mail lazy-config pattern).
    // A @ServiceRoute reached without a configured key is a deployment error,
    // so reject rather than allow.
    const expected = env.INTERNAL_API_KEY;
    if (!expected) {
      throw new UnauthorizedException('Internal API key not configured');
    }

    if (!safeEqual(key, expected)) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}

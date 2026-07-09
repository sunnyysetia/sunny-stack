import type { ExecutionContext } from '@nestjs/common';

// A pluggable authentication strategy. AuthGuard picks one per route based
// on the route decorator (@UserRoute → user session, @ServiceRoute → API key)
// and delegates the actual check here.
export interface AuthStrategy {
  validate(context: ExecutionContext): Promise<boolean> | boolean;
}

export const INTERNAL_AUTH_STRATEGY = 'INTERNAL_AUTH_STRATEGY';
export const USER_AUTH_STRATEGY = 'USER_AUTH_STRATEGY';

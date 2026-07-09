export const BETTER_AUTH = Symbol('BETTER_AUTH');
// The base path better-auth's routes mount under. The dashboard's auth client
// must point at `${SELF_BASE_URL}${BETTER_AUTH_BASE_PATH}`.
export const BETTER_AUTH_BASE_PATH = '/auth/client';
export type { Auth } from 'better-auth';

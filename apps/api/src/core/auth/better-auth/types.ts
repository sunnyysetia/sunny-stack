import type { Auth, BetterAuthOptions } from 'better-auth';

import type { createBetterAuthConfig } from './config';

// Derive the fully-typed Auth instance from our actual config (plugins,
// session shape, org/admin fields) so `auth.api.*` calls and the resolved
// session/user are typed against THIS app's config, not the base library.
type AppBetterAuthOptions = Awaited<ReturnType<typeof createBetterAuthConfig>> &
  Required<Pick<BetterAuthOptions, 'database'>>;

export type AppAuth = Auth<AppBetterAuthOptions>;
export type AppAuthSessionResult = AppAuth['$Infer']['Session'];
export type AppAuthSession = AppAuthSessionResult['session'];
export type AppAuthUser = AppAuthSessionResult['user'];

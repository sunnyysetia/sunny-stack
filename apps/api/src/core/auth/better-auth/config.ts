import type { BetterAuthOptions } from 'better-auth';

import { trustedOrigins } from '@/config/cors.config';

export interface BetterAuthConfig {
  secret: string;
  baseURL: string;
  basePath: string;
}

export const createBetterAuthConfig = (
  config: BetterAuthConfig,
): Omit<BetterAuthOptions, 'database'> => ({
  secret: config.secret,
  baseURL: config.baseURL,
  basePath: config.basePath,
  trustedOrigins: trustedOrigins,

  // Session
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
  },

  // Methods
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: {
      generateId: 'uuid',
    },
  },
});

import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

import { env } from './env';

// Origins allowed to make credentialed (cookie-bearing) requests. The
// dashboard origin is env-driven so the same build points at localhost in
// dev and the deployed frontend in prod. Add extra fixed origins (marketing
// site, admin console) to this list as needed.
export const getTrustedOrigins = (): string[] => [
  env.DASHBOARD_URL,
  ...(env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : []),
];

// Function form (not a static object) so the trusted-origin list is
// evaluated per request — a dynamic origin callback that reflects the
// current env rather than being frozen at module load. Shared by both the
// Express CORS middleware (main.ts) and better-auth's `trustedOrigins`.
export const createCorsConfig = (): CorsOptions => ({
  origin: (origin, callback) => {
    // Same-origin / non-browser requests (curl, health probes) send no Origin.
    if (!origin || getTrustedOrigins().includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

// This file exists solely for use by the Better Auth CLI (schema generation
// via `pnpm auth:generate`). The CLI requires `auth` to be a concrete value,
// not a Promise — so plugins are imported STATICALLY here (unlike the app
// runtime, which dynamic-imports them for CJS compatibility) and passed into
// buildBetterAuthConfig, the single source of truth for auth configuration.
// The db client declared here is not used at runtime.

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, emailOTP, organization } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from '../../database/schema';

import { buildBetterAuthConfig } from './config';
import { BETTER_AUTH_BASE_PATH } from './constants';

// Reads `process.env` raw (not the typed `@/config/env`) deliberately: this is
// a standalone entry point loaded by the `@better-auth/cli` outside the Nest DI
// graph, so importing the app's env module (which parses/validates the full
// schema and pulls in DI-bound config) would be inappropriate here.
const db = drizzle({
  connection: process.env.DATABASE_URL!,
  casing: 'snake_case',
  schema,
});

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  ...buildBetterAuthConfig({
    config: {
      secret: process.env.BETTER_AUTH_SECRET!,
      baseURL: process.env.SELF_BASE_URL!,
      basePath: BETTER_AUTH_BASE_PATH,
    },
    deps: { isCliMode: true },
    plugins: { admin, emailOTP, organization },
  }),
});

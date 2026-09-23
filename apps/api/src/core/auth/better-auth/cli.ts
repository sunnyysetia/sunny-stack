// This file exists solely for use by the Better Auth CLI (schema generation
// via `pnpm auth:generate`). The CLI loads it outside the Nest DI graph, so it
// builds its own throwaway db client (never used at runtime) and reuses
// createBetterAuthConfig, the single source of truth for auth configuration.

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from '../../database/schema/index.js';

import { createBetterAuthConfig } from './config.js';
import { BETTER_AUTH_BASE_PATH } from './constants.js';

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
  ...createBetterAuthConfig(
    {
      secret: process.env.BETTER_AUTH_SECRET!,
      baseURL: process.env.SELF_BASE_URL!,
      basePath: BETTER_AUTH_BASE_PATH,
    },
    { isCliMode: true },
  ),
});

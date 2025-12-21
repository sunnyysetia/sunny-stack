// Note:
// This file exists solely for use by the Better Auth CLI.
// The CLI cannot access the better auth client from the constructor of the service so we need to declare it here.
// It is so the CLI can generate database migrations, as it is unable to read the one in service as it's not directly exported.
// The db client declared here is not actually used in this app.

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from '../../../core/database/schema';

import { createBetterAuthConfig } from './config';

const db = drizzle({
  connection: process.env.DATABASE_URL!,
  casing: 'snake_case',
  schema,
});

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  ...createBetterAuthConfig({
    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: process.env.SELF_BASE_URL!,
    basePath: process.env.BETTER_AUTH_BASE_PATH!,
  }),
});

import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Every drizzle-kit script sets DRIZZLE_ENV_FILE explicitly (no silent
// fallback) so you can never run against the wrong DB by omission —
// `.env.local` for generate/migrate/studio.
const envFile = process.env.DRIZZLE_ENV_FILE;
if (!envFile) {
  throw new Error(
    'DRIZZLE_ENV_FILE is required (e.g. .env.local). ' +
      'Run drizzle-kit via the package.json db:* scripts, not directly.',
  );
}
// override: true so the selected file always wins over an ambient
// DIRECT_DATABASE_URL already exported in the shell — otherwise dotenv keeps
// the pre-existing value and a stray export could silently point migrations
// or studio at the wrong database, defeating the explicit-env-file split.
config({ path: envFile, override: true });

const directDatabaseUrl = process.env.DIRECT_DATABASE_URL;
if (!directDatabaseUrl) {
  throw new Error('DIRECT_DATABASE_URL is required in the selected DRIZZLE_ENV_FILE.');
}

export default defineConfig({
  schema: './src/core/database/schema/index.ts',
  out: './src/core/database/migrations',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    // drizzle-kit runs DDL + takes a migration advisory lock, so it needs
    // the session-mode (direct) connection, not a transaction pooler.
    url: directDatabaseUrl,
  },
});

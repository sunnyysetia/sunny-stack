// Production migration runner. Uses drizzle-orm's runtime migrator so it
// works in the prod image without drizzle-kit (a devDependency). Run this
// against the freshly-built image BEFORE the service rollout. Locally use
// `pnpm db:migrate` (drizzle-kit) for the interactive rename UX.

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

import * as schema from '../src/core/database/schema';

async function main(): Promise<void> {
  // Migrations run DDL inside transactions and take a migration advisory
  // lock, so they need a session-mode (direct) connection — a transaction
  // pooler would break both. The long-lived app pool uses the pooled
  // `DATABASE_URL`; migrations use the direct one.
  const connectionString = process.env.DIRECT_DATABASE_URL;
  if (!connectionString) {
    throw new Error('DIRECT_DATABASE_URL is required');
  }

  // From dist/scripts/migrate.js, resolve back to the source SQL folder.
  // pnpm's `--prod deploy --legacy` copies the package directory verbatim
  // (minus node_modules), so the src tree ships alongside dist in the image.
  const migrationsFolder = resolve(__dirname, '../../src/core/database/migrations');
  if (!existsSync(migrationsFolder)) {
    throw new Error(
      `Migrations folder not found at ${migrationsFolder}. ` +
        `The prod image must include src/core/database/migrations/.`,
    );
  }

  const pool = new Pool({ connectionString, max: 1 });
  const db = drizzle({ client: pool, schema, casing: 'snake_case' });

  console.log(`Running migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log('Migrations applied successfully');

  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

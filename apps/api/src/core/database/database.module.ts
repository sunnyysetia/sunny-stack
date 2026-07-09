import { Global, Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { env } from '@/config/env';
import { getLogger } from '@/core/logging';

import { DB_CONNECTION, PG_POOL } from './database.constants';
import { DatabaseLifecycle } from './database.lifecycle';
import * as schema from './schema';

@Global() // Makes this module available globally without importing
@Module({
  providers: [
    {
      // An explicit `pg.Pool` (rather than letting drizzle create an opaque
      // one) so we own the tuning knobs AND — critically — can attach the
      // `pool.on('error')` handler below.
      provide: PG_POOL,
      useFactory() {
        const logger = getLogger('PgPool');

        const pool = new Pool({
          connectionString: env.DATABASE_URL,
          max: env.PG_POOL_MAX,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: env.PG_CONNECTION_TIMEOUT_MS,
          // Do NOT set `statement_timeout` here. node-postgres sends it as a
          // connection *startup parameter*, which a transaction-mode pooler
          // (PgBouncer) rejects with `08P01 unsupported startup parameter`,
          // killing every pooled connection at handshake. Bound query time
          // client-side via `query_timeout` instead — it is never sent to the
          // server, so it is pooler-safe.
          query_timeout: 60_000,
          allowExitOnIdle: false,
        });

        // CRITICAL: without this listener, an idle-connection error (e.g. a
        // pooler severing a pooled client) surfaces as an 'error' event with
        // no listener, which Node throws past all async boundaries and crashes
        // the entire process.
        pool.on('error', (err) => {
          logger.error({ err }, 'idle pg client error (suppressed to prevent process crash)');
        });

        return pool;
      },
    },
    {
      provide: DB_CONNECTION,
      inject: [PG_POOL],
      useFactory(pool: Pool) {
        return drizzle({
          client: pool,
          casing: 'snake_case',
          schema,
        });
      },
    },
    DatabaseLifecycle,
  ],
  exports: [DB_CONNECTION, PG_POOL],
})
export class DatabaseModule {}

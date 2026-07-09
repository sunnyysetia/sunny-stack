import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Pool } from 'pg';

import { PG_POOL } from './database.constants';

// Drains the pg pool on graceful shutdown so in-flight queries finish and
// sockets close cleanly instead of being severed by process exit. Requires
// `app.enableShutdownHooks()` in main.ts for the hook to fire.
@Injectable()
export class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @InjectPinoLogger(DatabaseLifecycle.name) private readonly logger: PinoLogger,
  ) {}

  async onApplicationShutdown() {
    await this.pool.end();
    this.logger.info('pg pool drained');
  }
}

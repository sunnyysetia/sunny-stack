import { Controller, Get, Inject, Res } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { PublicRoute } from '@/core/auth/decorators';
import { type Database, DB_CONNECTION } from '@/core/database';

// Two distinct probes — keep them distinct, they answer different questions:
//
// - `GET /health` — LIVENESS. Is the process up and the event loop
//   responsive? Static 200, no dependencies. Wire this to the container
//   orchestrator's health check: if it fails, the task is recycled. It MUST
//   stay dependency-free — a DB blip must never make the orchestrator kill
//   the only task.
//
// - `GET /health/ready` — READINESS. Can this task actually serve a request,
//   i.e. is the DB reachable? Runs `SELECT 1`; 200 when reachable, 503 when
//   not. Wire this to the load balancer target group: on 503 the LB drains
//   traffic (a DB outage stops HTTP serving anyway) — but the orchestrator
//   does NOT kill the task (that's liveness's job), so there's no
//   DB-blip-induced recycle loop.

// Tight cap on the readiness ping — far below the pool's 60s `query_timeout`
// so a saturated/unreachable DB flips us to 503 fast instead of hanging the
// load-balancer health check.
const READINESS_DB_TIMEOUT_MS = 2_000;

@PublicRoute()
@Controller()
export class HealthController {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: Database,
    @InjectPinoLogger(HealthController.name) private readonly logger: PinoLogger,
  ) {}

  @Get('health')
  liveness() {
    return { status: 'ok' };
  }

  @Get('health/ready')
  async readiness(@Res({ passthrough: true }) res: Response) {
    const ok = await this.canReachDb();
    res.status(ok ? 200 : 503);
    return { status: ok ? 'ready' : 'unavailable' };
  }

  private async canReachDb(): Promise<boolean> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('readiness db ping timed out')),
        READINESS_DB_TIMEOUT_MS,
      );
    });
    try {
      await Promise.race([this.db.execute(sql`select 1`), timeout]);
      return true;
    } catch (err) {
      this.logger.warn({ err }, 'readiness check failed: database unreachable');
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}

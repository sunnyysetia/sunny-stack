import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PgBoss } from 'pg-boss';

import { env } from '@/config/env';
import { getLogger } from '@/core/logging';

import { ShutdownSignal } from './shutdown-signal';

// ─────────────────────────────────────────────────────────────────────
// DESIGNING A QUEUE? READ THIS FIRST.
//
// Deploys SIGKILL the worker mid-job. A job that takes longer than the
// drain window (see boss.stop timeout below) WILL be killed and retried.
// pg-boss is therefore AT-LEAST-ONCE. Every contract below follows from
// that one fact.
//
// 1. IDEMPOTENCY IS MANDATORY. A handler must be safe to run twice. A
//    kill can land anywhere — after a row is written but before the job
//    acks, after an email is sent but before it's recorded. Guard with
//    a unique key / "already done?" check, not with hope. If you can't
//    make it idempotent, you can't put it on a queue.
//
// 2. EXTERNAL SIDE EFFECT + DB WRITE ARE NOT ATOMIC. Sending an email,
//    calling a third-party API, charging a card — none of these commit
//    with your DB transaction. Persist the INTENT first; treat "intent
//    persisted" as NOT "side effect done"; gate the idempotent
//    short-circuit on a confirmed-done marker (e.g. `dispatchedAt`), and
//    re-drive the side effect on retry. Use a provider idempotency token
//    when the provider offers one.
//
// 3. USE reconcileQueue, NEVER createQueue. createQueue is create-only:
//    it silently no-ops on a queue that already exists from a prior
//    boot, so config edits never reach prod. reconcileQueue converges
//    the live queue to this code every start (`reconcile-queue.ts`).
//
// 4. SET heartbeatSeconds on any queue whose jobs can run more than a
//    few seconds. Under groupConcurrency, a job stranded `active` by a
//    killed worker blocks its whole group until reclaim — heartbeat
//    makes that ~1 min instead of the default expireInSeconds.
//
// 5. expireInSeconds = the absolute wall-clock ceiling for one job.
//    Set it above your true worst case.
//
// 6. WIRE retry + deadLetter, and run the dead-letter worker with
//    runDeadLetterBatch (`job-runner.ts`) — it ALWAYS records the terminal
//    failure (a reclaimed job never hit runJobBatch's catch, so this is
//    its only signal) and optionally pages. A job must never fail silently.
//
// 7. USE runJobBatch for the worker body. With batchSize > 1, an
//    unguarded throw fails the ENTIRE batch; runJobBatch isolates
//    per-job failures (`job-runner.ts`). Cron ticks use runCronTick
//    (swallow + recover on next fire), and the dead-letter worker uses
//    runDeadLetterBatch (point 6).
//
// In practice: wire work queues with `registerWorkQueue` and cron ticks
// with `registerCron` (`register.ts`) — they encode points 3, 6 and 7 so
// you can't skip them. This module provides only the shared pg-boss
// singleton + lifecycle; there are no domain consumers here.
// ─────────────────────────────────────────────────────────────────────

export const PG_BOSS = Symbol('PG_BOSS');

// Graceful drain window on shutdown. Sized to comfortably cover common short
// jobs; multi-minute jobs are deliberately reclaimed via heartbeat rather than
// drained (see ShutdownSignal for cooperative abort). MUST be less than the
// orchestrator's stop timeout minus the time the rest of Nest's shutdown needs.
const BOSS_STOP_GRACEFUL_TIMEOUT_MS = 100_000;

// Stops pg-boss gracefully on shutdown — halts polling and waits for in-flight
// handlers to finish, so a PLANNED restart drains cleanly instead of orphaning
// work `active`. Requires `app.enableShutdownHooks()` in `main.ts`.
@Injectable()
class QueueLifecycle implements OnApplicationShutdown {
  constructor(
    @Inject(PG_BOSS) private readonly boss: PgBoss,
    @InjectPinoLogger(QueueLifecycle.name) private readonly logger: PinoLogger,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.boss.stop({ graceful: true, timeout: BOSS_STOP_GRACEFUL_TIMEOUT_MS });
      this.logger.info('pg-boss stopped gracefully');
    } catch (err) {
      this.logger.error({ err }, 'pg-boss graceful stop failed');
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: PG_BOSS,
      useFactory: async (): Promise<PgBoss> => {
        // pg-boss MUST use a session-mode (direct) connection, never a
        // transaction-mode pooler: it coordinates workers and maintenance with
        // session-scoped advisory locks, which a transaction pooler silently
        // drops when it returns the connection to the pool after each txn.
        const logger = getLogger('PgBoss');
        // persistWarnings records pg-boss `warning` events (slow_query,
        // queue_backlog, clock_skew) to the schema for later inspection.
        const boss = new PgBoss({
          connectionString: env.DIRECT_DATABASE_URL,
          persistWarnings: true,
          max: env.PGBOSS_POOL_MAX,
          connectionTimeoutMillis: env.PGBOSS_CONNECTION_TIMEOUT_MS,
        });
        // pg-boss emits runtime connection errors as EventEmitter `error`
        // events. Without a listener, Node treats them as fatal and exits.
        boss.on('error', (err) => {
          logger.error({ err }, 'pg-boss runtime error');
        });
        await boss.start();
        return boss;
      },
    },
    QueueLifecycle,
    ShutdownSignal,
  ],
  exports: [PG_BOSS, ShutdownSignal],
})
export class QueueModule {}

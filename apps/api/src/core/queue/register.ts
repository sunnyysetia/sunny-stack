import type { Job, JobWithMetadata, Queue, WorkOptions } from 'pg-boss';

import { getLogger } from '@/core/logging';

import type { OpsAlertInput, OpsAlertService } from '../alerting/ops-alert.service';

import {
  type QueueFailureClient,
  runCronTick,
  runDeadLetterBatch,
  runJobBatch,
} from './job-runner';
import {
  type QueueReconciler,
  reconcileQueue,
  reconcileQueueWithDeadLetter,
} from './reconcile-queue';

// The two entry points every queue goes through. They encode the
// queue.module.ts doctrine (points 3, 6 and 7) so a new queue can't
// accidentally skip reconciliation, dead-letter capture, or per-job failure
// isolation:
//
//   • registerWorkQueue — a producer/consumer queue with a dead-letter.
//   • registerCron      — a schedule-driven tick with swallow-and-recover
//                         semantics (the next fire is the retry).
//
// Queue names are dot-segmented (`report.generate`, `email.digest`) and double
// as the logger context. Dead-letter names are always derived — never
// hand-written.

/** Retry defaults shared by most work queues: 3 retries, 30s base delay,
 *  exponential backoff. Deviate per-queue only with a stated reason. */
export const DEFAULT_QUEUE_RETRY = {
  retryLimit: 3,
  retryDelay: 30,
  retryBackoff: true,
} as const;

export interface QueueWorkerClient {
  work<TPayload extends object>(
    name: string,
    options: WorkOptions & { includeMetadata: true },
    handler: (jobs: JobWithMetadata<TPayload>[]) => Promise<void>,
  ): Promise<string>;
  work<TPayload extends object>(
    name: string,
    options: WorkOptions,
    handler: (jobs: Job<TPayload>[]) => Promise<void>,
  ): Promise<string>;
}

export interface QueueSchedulerClient {
  schedule(name: string, cron: string): Promise<void>;
}

export type WorkQueueBoss = QueueReconciler & QueueWorkerClient & QueueFailureClient;
export type CronQueueBoss = QueueReconciler & QueueWorkerClient & QueueSchedulerClient;

/** `<queue>.dead` — the single dead-letter naming rule. */
export function deadLetterName(queue: string): string {
  return `${queue}.dead`;
}

export interface WorkQueueSpec<TPayload extends object> {
  boss: WorkQueueBoss;
  /** Dot-segmented queue name. Also the logger context. */
  queue: string;
  /** Queue config converged every boot (retry / heartbeat / expire / policy).
   *  The dead-letter is derived from the queue name, never passed. */
  config: Omit<Queue, 'name' | 'deadLetter'>;
  /** Worker tuning. `batchSize` defaults to 5; `includeMetadata` is always
   *  set (runJobBatch needs retryCount/retryLimit). */
  worker?: Pick<WorkOptions, 'batchSize' | 'groupConcurrency'>;
  /** Structured fields identifying a job for the per-job event. */
  describe: (data: TPayload) => Record<string, unknown>;
  /** Per-job handler. Throw to retry / dead-letter; return to ack. */
  handle: (job: JobWithMetadata<TPayload>) => Promise<void>;
  /** The owning tenant — scopes the dead-letter alert dedupe key. `null` only
   *  for a queue with no tenant dimension. Explicit (not derived from
   *  `describe`) so the paging key can't silently collapse across tenants. */
  tenantId: (data: TPayload) => string | null;
  /** Present ⇒ a dead-lettered job raises an ops alert (deduped per tenant).
   *  Omit for queues whose terminal failure is log-only. */
  page?: {
    opsAlert: OpsAlertService;
    build: (data: TPayload) => Omit<OpsAlertInput, 'key'>;
  };
  /** Optional dead-letter state cleanup. A throw is caught so it can't wedge
   *  the worker. */
  onDeadLetter?: (data: TPayload) => Promise<void>;
}

/**
 * Wire a work queue end to end: reconcile the queue + its derived dead-letter,
 * register the worker (per-job failure isolation via runJobBatch), and register
 * the dead-letter worker (mandatory capture via runDeadLetterBatch).
 */
export async function registerWorkQueue<TPayload extends object>(
  spec: WorkQueueSpec<TPayload>,
): Promise<void> {
  const deadLetter = deadLetterName(spec.queue);
  await reconcileQueueWithDeadLetter(spec.boss, spec.queue, deadLetter, spec.config);

  await spec.boss.work<TPayload>(
    spec.queue,
    { batchSize: 5, ...spec.worker, includeMetadata: true },
    runJobBatch<TPayload>({
      boss: spec.boss,
      queueName: spec.queue,
      describe: spec.describe,
      handle: spec.handle,
    }),
  );

  await spec.boss.work<TPayload>(
    deadLetter,
    { batchSize: 5 },
    runDeadLetterBatch<TPayload>({
      queueName: spec.queue,
      describe: spec.describe,
      tenantId: spec.tenantId,
      page: spec.page,
      onDeadLetter: spec.onDeadLetter,
    }),
  );

  getLogger(spec.queue).info({ queue: spec.queue, deadLetter }, 'queue ready');
}

export interface CronSpec {
  boss: CronQueueBoss;
  /** Cron queue name — also the log label. */
  queue: string;
  /** UTC cron expression. Stagger new schedules so heavy jobs never share a
   *  minute and dailies never share a time. */
  schedule: string;
  /** The tick body. Errors are swallowed and logged (runCronTick) — the next
   *  scheduled fire is the recovery mechanism. */
  run: () => Promise<void>;
  /** Default 60. Raise for ticks whose walks legitimately run long. Also the
   *  reclaim granularity: a tick whose worker dies is re-fired after ~this
   *  long, possibly while the stale run still executes — tick bodies must
   *  tolerate a concurrent duplicate. */
  heartbeatSeconds?: number;
}

/**
 * Wire a cron end to end: reconcile the queue, register the tick worker, and
 * register the schedule.
 */
export async function registerCron(spec: CronSpec): Promise<void> {
  await reconcileQueue(spec.boss, spec.queue, {
    heartbeatSeconds: spec.heartbeatSeconds ?? 60,
  });

  const tick = runCronTick({ label: spec.queue, run: spec.run });
  await spec.boss.work(spec.queue, { batchSize: 1 }, async (jobs) => {
    for (const _job of jobs) {
      await tick();
    }
  });

  await spec.boss.schedule(spec.queue, spec.schedule);
  getLogger(spec.queue).info({ queue: spec.queue, schedule: spec.schedule }, 'cron scheduled');
}

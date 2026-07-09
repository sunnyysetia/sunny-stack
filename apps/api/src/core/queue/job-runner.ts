import type { CommandResponse, Job, JobWithMetadata } from 'pg-boss';

import { getLogger } from '@/core/logging';

import type { OpsAlertClient, OpsAlertInput } from '../alerting/ops-alert.service';

// Uniform per-job error logging + per-job failure isolation for pg-boss
// workers.
//
// pg-boss has no default error handler — when a `boss.work` callback rejects,
// the job is just redelivered (or, on the last retry, moved to the dead-letter
// queue) with no indication of WHY. Worse, with `batchSize > 1` the handler is
// one atomic unit: pg-boss completes ALL active job ids when it resolves and
// fails ALL of them when it throws. Throwing on the second job in a batch of
// five would therefore re-deliver the first (already processed) and fail the
// remaining three that never ran.
//
// `runJobBatch` keeps the throw-to-retry contract but converts it to per-JOB
// semantics: errors are logged, the failed job is explicitly transitioned via
// `boss.fail(...)` (which leaves it in `retry` / `failed` per the queue's
// retry + dead-letter wiring), and the loop continues.
//
// Requires `includeMetadata: true` on `boss.work` options so `job.retryCount`
// / `job.retryLimit` are present.

export interface RunJobBatchSpec<TPayload extends object> {
  boss: QueueFailureClient;
  // The queue name — also the logger `context`.
  queueName: string;
  // Structured fields describing the job, merged into the per-job log event.
  describe: (data: TPayload) => Record<string, unknown>;
  // Per-job handler. Throw to retry / dead-letter; return to ack.
  handle: (job: JobWithMetadata<TPayload>) => Promise<void>;
}

export interface QueueFailureClient {
  fail(name: string, id: string | string[], data?: object | null): Promise<CommandResponse>;
}

export function runJobBatch<TPayload extends object>(
  spec: RunJobBatchSpec<TPayload>,
): (jobs: JobWithMetadata<TPayload>[]) => Promise<void> {
  const logger = getLogger(spec.queueName);
  return async (jobs) => {
    const failures: Array<{ jobId: string; err: unknown }> = [];
    for (const job of jobs) {
      const startedAt = Date.now();
      try {
        await spec.handle(job);
        // Canonical per-job wide event.
        logger.info(
          {
            ...spec.describe(job.data),
            jobId: job.id,
            queue: spec.queueName,
            outcome: 'ok',
            durationMs: Date.now() - startedAt,
          },
          'job done',
        );
      } catch (err) {
        // retryCount = failed tries so far; the current try is one more.
        // retryLimit = retries AFTER the first attempt, so total = limit + 1.
        const attempt = job.retryCount + 1;
        const total = job.retryLimit + 1;
        const terminal = attempt >= total;
        logger.error(
          {
            err,
            ...spec.describe(job.data),
            jobId: job.id,
            queue: spec.queueName,
            attempt,
            total,
            terminal,
            outcome: 'error',
            durationMs: Date.now() - startedAt,
          },
          'job failed',
        );
        failures.push({ jobId: job.id, err });
      }
    }
    // Transition each failed job individually so pg-boss's batch-level
    // auto-complete (`state='active'` filter) skips them and only the
    // successful jobs land in `completed`. Done after the loop so a failure
    // mid-batch never short-circuits the surviving jobs.
    for (const { jobId, err } of failures) {
      const payload =
        err instanceof Error
          ? { message: err.message, stack: err.stack }
          : { message: String(err) };
      await spec.boss.fail(spec.queueName, jobId, payload);
    }
  };
}

// ─── cron-driven ticks ───────────────────────────────────────────────
//
// Cron ticks have different semantics: no retry, no dead-letter, and the next
// scheduled fire is the real recovery mechanism — so we SWALLOW errors rather
// than rethrowing (a thrown tick would propagate to pg-boss as a job failure,
// but there is no useful state machine to drive).

export interface RunCronTickSpec {
  // The queue name (registerCron passes it) — used as the logger `context`.
  label: string;
  run: () => Promise<void>;
}

export function runCronTick(spec: RunCronTickSpec): () => Promise<void> {
  const logger = getLogger(spec.label);
  return async () => {
    const startedAt = Date.now();
    logger.debug('tick start');
    try {
      await spec.run();
      logger.info({ outcome: 'ok', durationMs: Date.now() - startedAt }, 'tick done');
    } catch (err) {
      logger.error({ err, outcome: 'error', durationMs: Date.now() - startedAt }, 'tick failed');
    }
  };
}

// ─── dead-letter workers ─────────────────────────────────────────────
//
// A job arrives at its dead-letter queue only after exhausting its retries —
// but the path that delivered it was NOT necessarily observed. A job that THREW
// was logged on its last attempt by `runJobBatch`; a job that was RECLAIMED
// (worker killed / heartbeat lost / expiry) never entered `runJobBatch`'s catch
// at all. This worker is the one place that always has the dead job in hand, so
// this is where we make every dead-letter observable.

export interface RunDeadLetterBatchSpec<TPayload extends object> {
  // The ORIGINAL queue name (not the dead-letter queue).
  queueName: string;
  describe: (data: TPayload) => Record<string, unknown>;
  // The tenant/owner the job belongs to — scopes the alert dedupe key. `null`
  // only for a queue with no tenant dimension.
  tenantId: (data: TPayload) => string | null;
  // Present ⇒ raise an ops alert. The helper owns the (per-tenant) dedupe key;
  // `build` supplies the copy for THIS job.
  page?: {
    opsAlert: OpsAlertClient;
    build: (data: TPayload) => Omit<OpsAlertInput, 'key'>;
  };
  // Optional state cleanup for a job that died half-written. A throw is caught
  // + logged so one bad handler can't wedge the dead-letter worker.
  onDeadLetter?: (data: TPayload) => Promise<void>;
}

export function runDeadLetterBatch<TPayload extends object>(
  spec: RunDeadLetterBatchSpec<TPayload>,
): (jobs: Job<TPayload>[]) => Promise<void> {
  const logger = getLogger(spec.queueName);
  return async (jobs) => {
    for (const job of jobs) {
      const fields = spec.describe(job.data);
      const tenantId = spec.tenantId(job.data);
      // Always record. For a reclaimed job this is the ONLY signal.
      logger.error(
        {
          ...fields,
          jobId: job.id,
          queue: spec.queueName,
          ...(tenantId ? { tenantId } : {}),
          outcome: 'dead_letter',
        },
        'job dead-lettered',
      );
      if (spec.page) {
        await spec.page.opsAlert.alert({
          ...spec.page.build(job.data),
          key: `deadletter:${spec.queueName}:${tenantId ?? 'unknown'}`,
        });
      }
      if (spec.onDeadLetter) {
        try {
          await spec.onDeadLetter(job.data);
        } catch (err) {
          logger.error(
            { err, ...fields, jobId: job.id, queue: spec.queueName },
            'dead-letter cleanup handler failed',
          );
        }
      }
    }
  };
}

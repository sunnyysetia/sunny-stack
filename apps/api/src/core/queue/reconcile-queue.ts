import { type Queue, type QueueResult } from 'pg-boss';

import { getLogger } from '@/core/logging';

const logger = getLogger('reconcile-queue');

export interface QueueReconciler {
  createQueue(name: string, options?: Omit<Queue, 'name'>): Promise<void>;
  getQueue(name: string): Promise<QueueResult | null>;
  updateQueue(name: string, options?: Omit<Queue, 'name' | 'partition' | 'policy'>): Promise<void>;
}

// Reconcile a pg-boss queue's config to the definition in code.
//
// `boss.createQueue` is CREATE-ONLY: on an existing queue it is a silent
// no-op, so editing a queue's options in code never reaches a queue that was
// already created on a prior boot. This helper closes that trap — call it on
// bootstrap instead of `createQueue` and the DB queue converges to the code
// config every start.
//
//   • queue missing   → createQueue with the full config.
//   • queue exists     → updateQueue every non-policy tunable.
//   • policy mismatch  → updateQueue CANNOT change `policy`; changing it needs
//                        deleteQueue + createQueue (which drops the queue's
//                        jobs). We don't do that destructive step automatically
//                        — we log a loud warning so an operator can recreate the
//                        (drained) queue deliberately.
export async function reconcileQueue(
  boss: QueueReconciler,
  name: string,
  config: Omit<Queue, 'name'>,
): Promise<void> {
  const existing = await boss.getQueue(name);
  if (!existing) {
    await boss.createQueue(name, config);
    return;
  }

  if (config.policy && existing.policy !== config.policy) {
    logger.warn(
      { queue: name, existingPolicy: existing.policy, expectedPolicy: config.policy },
      "queue policy drift — updateQueue cannot change a queue's policy; recreate " +
        'the queue (deleteQueue + restart) while it is drained to apply it',
    );
  }

  // `policy` and `partition` are not part of `UpdateQueueOptions`; strip them
  // and converge the rest so a config edit reaches the live queue.
  const { policy: _policy, partition: _partition, ...updatable } = config;
  // A config with no updatable tunables leaves nothing to converge. pg-boss's
  // `updateQueue` throws ("no properties found to update") on an empty object,
  // which would abort bootstrap. Nothing to do, so skip the call.
  if (Object.keys(updatable).length === 0) return;
  await boss.updateQueue(name, updatable);
}

// Reconcile a work queue together with its dead-letter queue, in the one order
// pg-boss accepts. `createQueue` rejects a `deadLetter` target that does not
// exist yet, so the dead-letter queue MUST be created before the main queue
// references it. Owning that ordering here makes it impossible to invert.
export async function reconcileQueueWithDeadLetter(
  boss: QueueReconciler,
  name: string,
  deadLetter: string,
  config: Omit<Queue, 'name' | 'deadLetter'> = {},
): Promise<void> {
  await boss.createQueue(deadLetter);
  await reconcileQueue(boss, name, { ...config, deadLetter });
}

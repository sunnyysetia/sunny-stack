import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

const DEFAULT_DEDUPE_WINDOW_MS = 15 * 60 * 1000;

export interface OpsAlertInput {
  /** Stable dedupe key — repeats within the window are suppressed. e.g.
   *  `deadletter:<queue>:<tenantId>`. */
  key: string;
  subject: string;
  heading: string;
  intro: string;
  rows: { label: string; value: string }[];
  /** Flow tag for logs/audit. */
  reason: string;
  /** Optional deep link, surfaced in the alert. */
  inspect?: { path: string; label: string };
  /** Override the 15-min suppression window. */
  dedupeWindowMs?: number;
}

export interface OpsAlertClient {
  alert(input: OpsAlertInput): Promise<void>;
}

// Operational alerting — the "go look now" signal for terminal failures
// (dead-lettered jobs, etc.). This starter implementation LOGS the alert at
// `warn` with structured fields, deduped in-memory so a poison message storming
// its dead-letter queue yields one line per window, not one per retry.
//
// To page a human, swap the `logger.warn` for a real channel (email via
// PlatformMailService, Slack webhook, PagerDuty) — the OpsAlertClient
// interface and the queue call sites stay the same.
@Injectable()
export class OpsAlertService implements OpsAlertClient {
  private readonly lastSentMs = new Map<string, number>();

  constructor(@InjectPinoLogger(OpsAlertService.name) private readonly logger: PinoLogger) {}

  async alert(input: OpsAlertInput): Promise<void> {
    const window = input.dedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS;
    const now = Date.now();
    const last = this.lastSentMs.get(input.key);
    if (last !== undefined && now - last < window) {
      this.logger.debug({ key: input.key, reason: input.reason }, 'ops alert deduped');
      return;
    }
    this.lastSentMs.set(input.key, now);

    this.logger.warn(
      {
        key: input.key,
        reason: input.reason,
        subject: input.subject,
        rows: input.rows,
        ...(input.inspect ? { inspect: input.inspect.path } : {}),
      },
      `OPS ALERT: ${input.heading}`,
    );
    return Promise.resolve();
  }
}

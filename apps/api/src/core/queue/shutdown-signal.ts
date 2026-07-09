import { Injectable, type OnApplicationShutdown } from '@nestjs/common';

// The reason a shutdown abort carries. A distinct TYPE (not a bare
// `Error('app shutting down')`) so failure-classification code can recognise a
// deploy-interrupted operation by `instanceof`, never depending on the abort
// reason's message surviving an async boundary intact.
export class ShutdownAbortError extends Error {
  constructor() {
    super('app shutting down');
    this.name = 'ShutdownAbortError';
  }
}

// A process-level "we are shutting down" signal. A long-running worker combines
// it with its own per-job timeout (via `AbortSignal.any`) so a SIGTERM
// (deploy / restart) aborts the in-flight work COOPERATIVELY: the operation
// winds down in seconds instead of being SIGKILLed mid-flight and left stranded
// `active` until heartbeat reclaim.
//
// This is what makes graceful shutdown work for multi-minute jobs that can't
// drain to completion inside the orchestrator's stop timeout — aborting fast
// lets them finish inside the drain window.
//
// Requires `app.enableShutdownHooks()` in `main.ts` for the hook to fire.
@Injectable()
export class ShutdownSignal implements OnApplicationShutdown {
  private readonly controller = new AbortController();

  /** Aborts when the app begins shutting down. Combine with a per-job timeout. */
  get signal(): AbortSignal {
    return this.controller.signal;
  }

  onApplicationShutdown(): void {
    if (!this.controller.signal.aborted) {
      this.controller.abort(new ShutdownAbortError());
    }
  }
}

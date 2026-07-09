import { PinoLogger } from 'nestjs-pino';
import pino from 'pino';

// Structured logger for code that runs OUTSIDE Nest's DI container —
// plain module-level functions (utils, queue job-runner), config files,
// and provider factories that can't take `@InjectPinoLogger`. It returns a
// child of nestjs-pino's root logger, so it shares the exact same pino
// instance the app is configured with: same level, same redaction, same
// transport.
//
// The `{ context }` binding matches what `@InjectPinoLogger(Foo.name)`
// stamps, so DI and non-DI logs are filterable by `context` uniformly.
//
// `PinoLogger.root` is only populated once `LoggerModule` initialises,
// which happens AFTER module-load (call sites do `const logger =
// getLogger('X')` at import time, before bootstrap). So we resolve the
// child lazily on first use via a proxy — by the time anyone actually
// logs (per-request / per-job, always post-bootstrap) the root exists.
//
// If the root is still unset when something logs (a unit test exercising
// this code with no Nest app booted), we fall back to a silent logger so
// the call is a no-op instead of throwing — tests don't need to seed the
// root, and prod always has it well before first use.
let silentFallback: pino.Logger | undefined;

export function getLogger(context: string): pino.Logger {
  let child: pino.Logger | undefined;
  const resolve = (): pino.Logger => {
    if (child) return child;
    const root = PinoLogger.root as pino.Logger | undefined;
    if (!root) return (silentFallback ??= pino({ level: 'silent' }));
    return (child = root.child({ context }));
  };
  return new Proxy({} as pino.Logger, {
    get(_target, prop) {
      const logger = resolve();
      const value = Reflect.get(logger, prop, logger) as unknown;
      if (typeof value === 'function') {
        const fn = value as (...a: unknown[]) => unknown;
        return (...args: unknown[]): unknown => fn.apply(logger, args) as unknown;
      }
      return value;
    },
  });
}

import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// Load `.env.local` into `process.env` BEFORE parsing. This runs at import
// time — earlier than Nest's `ConfigModule.forRoot`, which would otherwise be
// the first to load the file — so the typed `env` below sees the same values.
// No `override`, so a real ambient env var always wins over the file (correct
// for prod, where the platform injects env and there is no file to read).
if (process.env.NODE_ENV !== 'production') {
  loadDotenv({ path: '.env.local' });
}

// ─────────────────────────────────────────────────────────────────────
// Typed environment — parsed ONCE at module load, exported as a frozen
// `env` object with a fully-typed `Env` shape.
//
// This is the single source of truth for process configuration. Instead
// of scattering `configService.getOrThrow('X')` + ad-hoc int parsing
// across providers, every var is declared here with its type, default,
// and coercion. A missing/malformed required var crashes the process at
// import time with a precise Zod error — loud-at-boot, never a silent
// half-configured runtime.
//
// NestJS `ConfigModule.forRoot` still loads `.env.local` into
// `process.env` (see app.module.ts) BEFORE this file is first imported,
// so the values are present here. Consumers can either read `env`
// directly (module-level code, provider factories) or keep using
// `ConfigService` (both read the same `process.env`).
// ─────────────────────────────────────────────────────────────────────

// Coerce an optional positive integer with a default. Blank/unset → default;
// present-but-not-a-positive-int → throw (a typo'd `PG_POOL_MAX=ten` fails
// loudly, it does not silently fall back).
const positiveInt = (fallback: number) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v == null || v === '' ? fallback : Number(v)))
    .pipe(z.number().int().positive());

const envSchema = z.object({
  // ── Runtime ──────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Deploy environment label — drives log formatting (pretty vs JSON) and
  // the non-prod email subject prefix. `local` for a dev machine.
  DEPLOY_ENV: z.string().trim().default('local'),
  // Service name stamped on every structured log line.
  SERVICE_NAME: z.string().trim().default('api'),
  PORT: z.coerce.number().int().positive().default(8000),
  LOG_LEVEL: z.string().trim().optional(),

  // ── Database ─────────────────────────────────────────────────────
  // Pooled (PgBouncer/transaction-mode) connection for the app's Drizzle pool.
  DATABASE_URL: z.string().min(1),
  // Session-mode (direct) connection — required by migrations (advisory lock)
  // and pg-boss (session-scoped locks). Same host as DATABASE_URL locally.
  DIRECT_DATABASE_URL: z.string().min(1),
  PG_POOL_MAX: positiveInt(25),
  PG_CONNECTION_TIMEOUT_MS: positiveInt(30_000),
  PGBOSS_POOL_MAX: positiveInt(10),
  PGBOSS_CONNECTION_TIMEOUT_MS: positiveInt(30_000),

  // ── URLs ─────────────────────────────────────────────────────────
  // This API's own public origin (better-auth baseURL, absolute callback URLs).
  SELF_BASE_URL: z.string().url().default('http://localhost:8000'),
  // The dashboard/frontend origin — CORS allow-list + invitation links.
  DASHBOARD_URL: z.string().url().default('http://localhost:3000'),

  // ── Auth ─────────────────────────────────────────────────────────
  BETTER_AUTH_SECRET: z.string().min(1),
  // Shared secret for service-to-service (internal) calls — the
  // `x-service-api-key` header validated by InternalAuthStrategy. Optional:
  // only required if you use `@ServiceRoute()`; InternalAuthStrategy rejects
  // requests when it is unset.
  INTERNAL_API_KEY: z.string().min(1).optional(),

  // ── AWS / S3 / SES (all optional — features degrade if unset) ─────
  AWS_REGION: z.string().trim().optional(),
  AWS_ACCESS_KEY_ID: z.string().trim().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().trim().optional(),
  S3_BUCKET: z.string().trim().optional(),
  S3_REGION: z.string().trim().optional(),
  // SES sending identity, e.g. `Acme <noreply@notify.acme.com>`.
  SES_FROM_EMAIL: z.string().trim().optional(),
  SES_REGION: z.string().trim().optional(),
  // Optional SES configuration set (delivery/bounce event routing).
  SES_CONFIGURATION_SET: z.string().trim().optional(),
});

export type Env = z.infer<typeof envSchema>;

// Parse once. Throws a formatted error at first import if the env is invalid.
export const env: Env = (() => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return Object.freeze(parsed.data);
})();

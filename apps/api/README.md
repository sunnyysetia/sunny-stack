# @repo/api

The backend API for the stack: **NestJS 11** for DI and HTTP wiring, **tRPC 11**
for the type-safe RPC surface consumed by the dashboard, **better-auth** for
sessions/organizations/email-OTP, and **Drizzle ORM** over **Postgres** for
persistence. Domain modules live under `src/modules/*`; generic infrastructure
(database, auth, queue, storage, mail, crypto, health, logging) lives under
`src/core/*`.

## Local setup

```bash
# from apps/api
cp .env.example .env.local          # fill in secrets (DB URLs, BETTER_AUTH_SECRET, …)

# from the repo root — starts local Postgres
docker compose up -d

# from apps/api — apply migrations, then run the API in watch mode
pnpm db:migrate
pnpm --filter @repo/api dev
```

The API serves health at `/health`, tRPC at `/trpc`, and better-auth at `/auth`.

## Scripts

| Script                          | What it does                                                |
| ------------------------------- | ----------------------------------------------------------- |
| `pnpm --filter @repo/api dev`   | Run the API in watch mode (`nest start --watch`).           |
| `pnpm --filter @repo/api build` | Compile to `dist/` (`nest build` + `tsc-alias`).            |
| `pnpm --filter @repo/api test`  | Run the Vitest suite.                                       |
| `pnpm db:generate`              | Generate a Drizzle migration from schema changes.           |
| `pnpm db:migrate`               | Apply pending migrations to the local database.             |
| `pnpm db:migrate:prod`          | Apply migrations in production (`dist/scripts/migrate.js`). |
| `pnpm auth:generate`            | Regenerate the better-auth Drizzle schema from its config.  |

Run `db:generate` / `db:migrate` from `apps/api` (they read `.env.local`).

# @repo/dashboard

The Sunny Stack dashboard — a Vite single-page app built with TanStack Router
and TanStack Query. It talks to `@repo/api` through a typed tRPC client and
handles authentication via better-auth (passwordless email OTP).

## Structure

- `src/routes` — file-based TanStack Router routes (`routeTree.gen.ts` is generated).
- `src/features` — feature modules (auth, books, …).
- `src/api` — tRPC client, TanStack Query setup, and shared types.
- `src/env.ts` — validated `import.meta.env` (requires `VITE_API_BASE_URL`).

Copy `.env.example` to `.env` and point `VITE_API_BASE_URL` at a running API.

## Development

This app is part of the Sunny Stack monorepo. Run everything from the repo root
so the API types build first:

```sh
pnpm dev        # start the dev server
pnpm build      # production build
pnpm typecheck  # type-check (builds @repo/api types first)
```

Lint and format also run from the repo root via pnpm.

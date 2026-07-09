# syntax=docker/dockerfile:1
#
# Dockerfile for @repo/api (NestJS backend)
#
# Uses pnpm's monorepo Docker pattern (https://pnpm.io/docker).
# `pnpm deploy --legacy` bundles the API + its prod deps into a
# standalone directory — no devDependencies, no unrelated packages.
#
# Docker context MUST be the repo root so we can access the lockfile
# and workspace packages (@repo/schemas, @repo/utils, @repo/config).
#
# Build:  docker build -f apps/api/Dockerfile -t repo-api .
# Run:    docker run -p 8000:8000 --env-file apps/api/.env repo-api

# Pin a specific patch, NOT a floating `22` tag, so builds are reproducible.
ARG NODE_VERSION=22.21.0
FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update -qq \
    && apt-get install --no-install-recommends -y ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10

# --- Build stage: install everything, compile, then bundle for prod ---
FROM base AS build
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @repo/schemas build
RUN pnpm --filter @repo/utils build
RUN pnpm --filter @repo/api build
RUN pnpm --filter @repo/api --prod deploy --legacy /prod/api

# --- Production stage: just the bundled output ---
FROM base
ARG UID=10001
RUN adduser --disabled-password --gecos "" --home "/app" --shell "/sbin/nologin" --uid "${UID}" appuser
WORKDIR /app
COPY --from=build --chown=appuser:appuser /prod/api .
USER appuser
ENV NODE_ENV=production
EXPOSE 8000
CMD ["node", "dist/src/main.js"]

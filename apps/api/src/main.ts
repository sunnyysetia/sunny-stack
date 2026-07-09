import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import * as trpcExpress from '@trpc/server/adapters/express';
import rateLimit from 'express-rate-limit';
import { Logger as PinoLogger } from 'nestjs-pino';

import { createCorsConfig } from './config/cors.config';
import { env } from './config/env';
import { getLogger } from './core/logging';
import { appRouter } from './trpc/app.router';
import { TrpcContextFactory } from './trpc/context.factory';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Expose the raw request body (needed for webhook signature verification).
    rawBody: true,
    // Buffer early logs until the pino logger is installed below.
    bufferLogs: true,
  });

  // Route all NestJS logging through pino → structured JSON.
  app.useLogger(app.get(PinoLogger));

  // Behind a single proxy hop (load balancer). Makes `req.ip` the real client
  // IP (from X-Forwarded-For) so the rate limiter keys per client. `1` (not
  // `true`) so a forged XFF can't spoof the source — the proxy appends the
  // real client as the last hop, which is the one we trust.
  app.set('trust proxy', 1);

  app.enableCors(createCorsConfig());

  // Global IP rate limit at the Express front door — a blunt DoS backstop for
  // tRPC + REST. Health probes are exempt. better-auth is raw-mounted with its
  // own tighter per-endpoint limits (see better-auth/config.ts).
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      skip: (req) => req.path.startsWith('/health'),
    }),
  );

  // Mount tRPC.
  const ctxFactory = app.get(TrpcContextFactory);
  app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext: ({ req }) => ctxFactory.create(req),
      onError: ({ error, type, path }) => {
        getLogger('Trpc').error(
          { err: error, type, path: path ?? null, code: error.code },
          'tRPC request failed',
        );
      },
    }),
  );

  // Run providers' shutdown hooks on SIGTERM/SIGINT — lets DatabaseLifecycle
  // drain the pool and QueueLifecycle stop pg-boss gracefully.
  app.enableShutdownHooks();

  // Last-resort capture for errors that escape every request/job scope.
  process.on('uncaughtException', (err) => {
    getLogger('Bootstrap').fatal({ err }, 'uncaughtException');
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    getLogger('Bootstrap').error({ err: reason }, 'unhandledRejection');
  });

  await app.listen(env.PORT);
}
bootstrap().catch((err) => {
  logger.error('Failed to start server', err instanceof Error ? err.stack : String(err));
  process.exit(1);
});

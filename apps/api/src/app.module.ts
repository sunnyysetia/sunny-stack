import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { stdSerializers } from 'pino';

import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';
import { env } from './config/env';
import { AuthGuard } from './core/auth/guards/auth.guard';
import { CoreModule } from './core/core.module';
import { HealthModule } from './core/health/health.module';
import { TrpcModule } from './trpc/trpc.module';

// AppModule keeps only infra: config, logging, core (DB / auth / queue /
// storage / mail wiring), health, and TrpcModule. Every domain module is
// imported by TrpcModule (the single domain importer) and reached transitively
// from here — one place to look when wiring a new module.
@Module({
  imports: [
    // Dev loads config from `.env.local` (also loaded early by config/env.ts);
    // in prod the env is supplied by the platform, so there's no file to read.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.local',
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    // Structured logging. `nestjs-pino` replaces the default NestJS logger
    // transparently — every `new Logger(ctx)` call site keeps working but
    // emits JSON. Pretty single-line console locally; raw JSON in prod.
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL ?? (env.DEPLOY_ENV === 'local' ? 'debug' : 'info'),
        base: { service: env.SERVICE_NAME, env: env.DEPLOY_ENV },
        serializers: { err: stdSerializers.err },
        // `/health` is pure noise; `/trpc` is a single batched POST whose
        // meaningful per-procedure event is emitted by the tRPC middleware
        // (trpc.ts), so the batched HTTP line would just be a duplicate.
        autoLogging: {
          ignore: (req: { url?: string }) =>
            (req.url?.startsWith('/health') ?? false) || (req.url?.startsWith('/trpc') ?? false),
        },
        redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        transport:
          env.DEPLOY_ENV === 'local'
            ? {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  colorize: true,
                  colorizeObjects: true,
                  ignore: 'pid,hostname,service,env,context',
                  messageFormat: '\x1B[36m{context}\x1B[0m {msg}',
                },
              }
            : undefined,
      },
    }),
    CoreModule,
    HealthModule,
    TrpcModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}

import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { toNodeHandler } from 'better-auth/node';

import { env } from '@/config/env.js';
import { type Database, DB_CONNECTION } from '@/core/database/index.js';
import { PlatformMailModule } from '@/core/platform-mail/platform-mail.module.js';
import { PlatformMailService } from '@/core/platform-mail/platform-mail.service.js';

import { createBetterAuthConfig } from './better-auth/config.js';
import { type AppAuth, BETTER_AUTH, BETTER_AUTH_BASE_PATH } from './better-auth/index.js';
import {
  INTERNAL_AUTH_STRATEGY,
  USER_AUTH_STRATEGY,
} from './guards/strategies/auth-strategy.interface.js';
import { InternalAuthStrategy } from './guards/strategies/internal-auth.strategy.js';
import { UserAuthStrategy } from './guards/strategies/user-auth.strategy.js';
import { AuthSessionService } from './auth-session.service.js';

@Module({
  imports: [PlatformMailModule],
  providers: [
    {
      provide: BETTER_AUTH,
      useFactory: (db: Database, mailer: PlatformMailService): AppAuth =>
        betterAuth({
          database: drizzleAdapter(db, { provider: 'pg' }),
          ...createBetterAuthConfig(
            {
              secret: env.BETTER_AUTH_SECRET,
              baseURL: env.SELF_BASE_URL,
              basePath: BETTER_AUTH_BASE_PATH,
            },
            {
              isCliMode: false,
              mailer,
              dashboardUrl: env.DASHBOARD_URL,
              isDev: env.NODE_ENV !== 'production',
            },
          ),
        }),
      inject: [DB_CONNECTION, PlatformMailService],
    },
    AuthSessionService,
    { provide: INTERNAL_AUTH_STRATEGY, useClass: InternalAuthStrategy },
    { provide: USER_AUTH_STRATEGY, useClass: UserAuthStrategy },
  ],
  exports: [BETTER_AUTH, AuthSessionService, INTERNAL_AUTH_STRATEGY, USER_AUTH_STRATEGY],
})
export class AuthModule implements OnModuleInit {
  constructor(
    private readonly adapter: HttpAdapterHost,
    @Inject(BETTER_AUTH) private readonly betterAuth: AppAuth,
  ) {}

  onModuleInit() {
    // Skip route mounting when running outside the HTTP-server context — e.g.
    // standalone scripts booted via NestFactory.createApplicationContext.
    // `httpAdapter` is only present when created via NestFactory.create.
    if (!this.adapter.httpAdapter) return;
    this.adapter.httpAdapter.all(`${BETTER_AUTH_BASE_PATH}/*splat`, toNodeHandler(this.betterAuth));
  }
}

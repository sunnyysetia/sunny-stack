import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import { env } from '@/config/env';
import { type Database, DB_CONNECTION } from '@/core/database';
import { PlatformMailModule } from '@/core/platform-mail/platform-mail.module';
import { PlatformMailService } from '@/core/platform-mail/platform-mail.service';

import { createBetterAuthConfig } from './better-auth/config';
import {
  INTERNAL_AUTH_STRATEGY,
  USER_AUTH_STRATEGY,
} from './guards/strategies/auth-strategy.interface';
import { InternalAuthStrategy } from './guards/strategies/internal-auth.strategy';
import { UserAuthStrategy } from './guards/strategies/user-auth.strategy';
import { AuthSessionService } from './auth-session.service';
import { type AppAuth, BETTER_AUTH, BETTER_AUTH_BASE_PATH } from './better-auth';

@Module({
  imports: [PlatformMailModule],
  providers: [
    {
      provide: BETTER_AUTH,
      useFactory: async (db: Database, mailer: PlatformMailService): Promise<AppAuth> => {
        const { betterAuth } = await import('better-auth');
        const { drizzleAdapter } = await import('better-auth/adapters/drizzle');

        return betterAuth({
          database: drizzleAdapter(db, { provider: 'pg' }),
          ...(await createBetterAuthConfig(
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
          )),
        });
      },
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

  async onModuleInit() {
    // Skip route mounting when running outside the HTTP-server context — e.g.
    // standalone scripts booted via NestFactory.createApplicationContext.
    // `httpAdapter` is only present when created via NestFactory.create.
    if (!this.adapter.httpAdapter) return;
    const { toNodeHandler } = await import('better-auth/node');
    this.adapter.httpAdapter.all(`${BETTER_AUTH_BASE_PATH}/*splat`, toNodeHandler(this.betterAuth));
  }
}

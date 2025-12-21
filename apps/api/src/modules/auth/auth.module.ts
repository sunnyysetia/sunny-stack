import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import type { Auth } from 'better-auth';
import cors, { type CorsOptions } from 'cors';

import corsConfig from '@/config/cors.config';
import { type Database, DB_CONNECTION } from '@/core/database';

import { createBetterAuthConfig } from './better-auth/config';
import { BETTER_AUTH } from './better-auth/constants';
import { AuthController } from './auth.controller';
import { AuthSessionService } from './auth-session.service';

@Module({
  providers: [
    {
      provide: BETTER_AUTH,
      useFactory: async (db: Database, config: ConfigService) => {
        const { betterAuth } = await import('better-auth');

        const { drizzleAdapter } = await import('better-auth/adapters/drizzle');

        return betterAuth({
          database: drizzleAdapter(db, { provider: 'pg' }),
          ...createBetterAuthConfig({
            secret: config.getOrThrow('BETTER_AUTH_SECRET'),
            baseURL: config.getOrThrow('SELF_BASE_URL'),
            basePath: config.getOrThrow('BETTER_AUTH_BASE_PATH'),
          }),
        });
      },
      inject: [DB_CONNECTION, ConfigService],
    },
    AuthSessionService,
  ],
  exports: [BETTER_AUTH, AuthSessionService],
  controllers: [AuthController],
})
export class AuthModule implements OnModuleInit {
  constructor(
    private readonly adapter: HttpAdapterHost,
    private readonly configService: ConfigService,
    @Inject(BETTER_AUTH) private readonly betterAuth: Auth,
  ) {}

  async onModuleInit() {
    // Apply BetterAuth-required CORS
    this.adapter.httpAdapter.use(cors(corsConfig as CorsOptions));

    // Mount BetterAuth routes
    const basePath = this.configService.getOrThrow<string>('BETTER_AUTH_BASE_PATH');

    const { toNodeHandler } = await import('better-auth/node');

    this.adapter.httpAdapter.all(`${basePath}/*splat`, toNodeHandler(this.betterAuth));
  }
}

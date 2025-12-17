import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';

import { DB_CONNECTION } from './database.constants';
import * as schema from './schema';

@Global() // Makes this module available globally without importing
@Module({
  providers: [
    {
      provide: DB_CONNECTION,
      inject: [ConfigService],
      useFactory(configService: ConfigService) {
        return drizzle({
          connection: configService.getOrThrow<string>('DATABASE_URL'),
          casing: 'snake_case',
          schema,
        });
      },
    },
  ],
  exports: [DB_CONNECTION],
})
export class DatabaseModule {}

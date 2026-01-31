import { Global, Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';

@Global()
@Module({
  imports: [AuthModule, DatabaseModule],
  providers: [],
  exports: [AuthModule, DatabaseModule],
})
export class CoreModule {}

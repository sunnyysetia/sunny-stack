import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth/auth.module';
import { TrpcContextFactory } from './trpc-context.factory';

@Module({
  imports: [AuthModule],
  providers: [TrpcContextFactory],
  exports: [TrpcContextFactory],
})
export class TrpcModule {}

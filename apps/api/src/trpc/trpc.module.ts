import { Module } from '@nestjs/common';

import { AuthModule } from '@/core/auth/auth.module';

import { TrpcContextFactory } from './context.factory';

@Module({
  imports: [AuthModule],
  providers: [TrpcContextFactory],
  exports: [TrpcContextFactory],
})
export class TrpcModule {}

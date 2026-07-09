import { Module } from '@nestjs/common';

import { AuthModule } from '@/core/auth/auth.module';
import { BooksModule } from '@/modules/books/books.module';

import { TrpcContextFactory } from './context.factory';

// TrpcModule is the sole domain importer. Every domain module (the `books`
// reference module, and yours as you add them) is pulled in here so the
// dependency graph the tRPC layer sees matches the actual code layout, and
// AppModule stays purely infra. AuthModule is imported for the context factory.
@Module({
  imports: [AuthModule, BooksModule],
  providers: [TrpcContextFactory],
  exports: [TrpcContextFactory],
})
export class TrpcModule {}

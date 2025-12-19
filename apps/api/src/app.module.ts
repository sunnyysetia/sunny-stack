import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CoreModule } from './core/core.module';
import { BooksModule } from './modules/books/books.module';
import { TrpcModule } from './trpc/trpc.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), CoreModule, TrpcModule, BooksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

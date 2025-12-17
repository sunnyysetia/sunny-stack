import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './core/core.module';
import { BooksModule } from './modules/books/books.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), CoreModule, BooksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

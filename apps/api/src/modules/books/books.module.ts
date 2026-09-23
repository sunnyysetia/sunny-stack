import { Module } from '@nestjs/common';

import { BooksController } from './books.controller.js';
import { BooksService } from './books.service.js';

@Module({
  controllers: [BooksController],
  providers: [BooksService],
  exports: [],
})
export class BooksModule {}

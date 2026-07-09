import { Controller, Get } from '@nestjs/common';

import { UserRoute } from '@/core/auth/decorators';

import { BooksService } from './books.service';

// Example REST controller. Marked @UserRoute so it requires a signed-in user
// (the global AuthGuard denies any handler with no access-level decorator).
// Most read/write surface should go through the tRPC `books` router instead —
// this exists to demonstrate a guarded NestJS controller.
@UserRoute()
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  getBooks() {
    return this.booksService.getBooks();
  }
}

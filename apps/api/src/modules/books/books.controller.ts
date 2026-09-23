import { Body, ConflictException, Controller, Get, Post, SerializeOptions } from '@nestjs/common';

import { UserRoute } from '@/core/auth/decorators/index.js';
import { isDbError } from '@/core/database/index.js';

import { bookSchema, type CreateBookInput, createBookSchema } from './books.schemas.js';
import { BooksService } from './books.service.js';

// Example REST controller. Marked @UserRoute so it requires a signed-in user
// (the global AuthGuard denies any handler with no access-level decorator).
// Most read/write surface should go through the tRPC `books` router instead —
// this exists to demonstrate a guarded NestJS controller with native Zod
// validation:
//
// - `@Body({ schema })` → request validated by the global
//   StandardSchemaValidationPipe; failures are a 400 listing each issue.
// - `@SerializeOptions({ schema })` → response validated + stripped by the
//   global StandardSchemaSerializerInterceptor (arrays are checked per item).
@UserRoute()
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @SerializeOptions({ schema: bookSchema })
  getBooks() {
    return this.booksService.getBooks();
  }

  @Post()
  @SerializeOptions({ schema: bookSchema })
  async createBook(@Body({ schema: createBookSchema }) body: CreateBookInput) {
    try {
      return await this.booksService.createBook(body);
    } catch (error) {
      if (isDbError(error, 'UNIQUE_CONSTRAINT')) {
        throw new ConflictException('Book title already taken');
      }
      throw error;
    }
  }
}

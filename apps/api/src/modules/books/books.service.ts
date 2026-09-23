import { Inject, Injectable } from '@nestjs/common';

import { type Database, DB_CONNECTION } from '@/core/database/index.js';
import { bookTable } from '@/core/database/schema/index.js';

import type { CreateBookInput } from './books.schemas.js';

@Injectable()
export class BooksService {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  getBooks() {
    return this.db.select().from(bookTable);
  }

  async createBook(input: CreateBookInput) {
    const [book] = await this.db.insert(bookTable).values(input).returning();
    return book;
  }
}

import { Inject, Injectable } from '@nestjs/common';

import { type Database, DB_CONNECTION } from '@/core/database';
import { bookTable } from '@/core/database/schema';

import type { CreateBookInput } from './books.schemas';

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

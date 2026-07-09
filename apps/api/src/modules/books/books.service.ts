import { Inject, Injectable } from '@nestjs/common';

import { type Database, DB_CONNECTION } from '@/core/database';
import { bookTable } from '@/core/database/schema';

@Injectable()
export class BooksService {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  getBooks() {
    return this.db.select().from(bookTable);
  }
}

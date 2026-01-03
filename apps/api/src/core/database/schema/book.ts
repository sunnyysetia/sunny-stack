import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const book = pgTable('book', {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull(),
  publishedAt: timestamp({ withTimezone: true }).notNull(),
});

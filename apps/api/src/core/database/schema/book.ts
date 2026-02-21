import { pgTable, text, unique } from 'drizzle-orm/pg-core';

import { createdAt, randomPrimaryUUID } from '../utils';

export const bookTable = pgTable(
  'book',
  {
    id: randomPrimaryUUID,
    title: text().notNull(),
    publishedAt: createdAt,
  },
  (t) => [unique().on(t.title)],
);

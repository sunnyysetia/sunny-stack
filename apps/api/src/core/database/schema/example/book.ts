import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';

import { primaryUUID } from '../../utils';

import { exampleStatusEnum } from './enums';

// Example domain table backing the `books` reference module. Delete this
// (and the `example/` folder) when you add your own domains — it exists to
// demonstrate the schema-folder convention (see SCHEMA_NAMING.md), the
// `primaryUUID` helper, and the single-source pg-enum pattern (`status`
// derives from `@repo/schemas` via `exampleStatusEnum`). `publishedAt` is a
// user-supplied date (the router passes `input.publishedAt`), so it is a
// plain timestamp column, not the auto-`defaultNow()` `createdAt` helper.
export const bookTable = pgTable(
  'example_book',
  {
    id: primaryUUID(),
    title: text().notNull(),
    status: exampleStatusEnum().notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [unique().on(t.title)],
);

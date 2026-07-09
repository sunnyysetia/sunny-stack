import { sql } from 'drizzle-orm';
import { timestamp, uuid } from 'drizzle-orm/pg-core';

// Time-ordered v7 UUID primary key, generated DB-side by Postgres's
// `uuidv7()`. The timestamp prefix gives sequential B-tree locality on insert
// (unlike random v4), so primary keys cluster at the index's right edge
// instead of fragmenting it. Not named `random*` on purpose — v7 is ordered.
//
// Requires Postgres 18+ for the built-in `uuidv7()`. On older Postgres,
// swap to `.defaultRandom()` (v4) or install the `pg_uuidv7` extension.
export const primaryUUID = () =>
  uuid()
    .primaryKey()
    .default(sql`uuidv7()`);

export const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

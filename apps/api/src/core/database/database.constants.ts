import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from './schema';

export const DB_CONNECTION = Symbol('DB_CONNECTION');
export const PG_POOL = Symbol('PG_POOL');
export type Database = NodePgDatabase<typeof schema>;

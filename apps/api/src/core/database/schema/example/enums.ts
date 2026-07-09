import { EXAMPLE_STATUSES } from '@repo/schemas';
import { pgEnum } from 'drizzle-orm/pg-core';

// The Postgres enum derives from the shared value tuple in `@repo/schemas`,
// so the DB CHECK constraint, the zod validator (`exampleStatusSchema`), and
// the TS union (`ExampleStatus`) all come from ONE source and can never drift.
//
// This is the canonical convention: every pg enum's value list lives in
// `@repo/schemas` as `const FOO = [...] as const`; the schema package exposes
// `z.enum(FOO)` + the union type, and drizzle consumes the same tuple here.
export const exampleStatusEnum = pgEnum('example_status', EXAMPLE_STATUSES);

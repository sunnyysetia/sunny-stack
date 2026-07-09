import { z } from 'zod';
// Single source of truth for a pg enum: the tuple feeds both drizzle's pgEnum
// (in apps/api) and this zod enum, so DB constraint + TS union never drift.
export const EXAMPLE_STATUSES = ['active', 'archived', 'draft'] as const;
export const exampleStatusSchema = z.enum(EXAMPLE_STATUSES);
export type ExampleStatus = (typeof EXAMPLE_STATUSES)[number];

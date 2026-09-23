import { exampleStatusSchema } from '@repo/schemas';
import { z } from 'zod';

// Plain Zod schemas, shared by the tRPC router (`.input(...)`) and the REST
// controller (`@Body({ schema })` / `@SerializeOptions({ schema })`). No DTO
// classes — Nest 12 accepts any Standard Schema directly.

// `status` reuses the SAME `@repo/schemas` source that defines the pg enum,
// so the API's input validation and the DB constraint stay in lockstep.
export const createBookSchema = z.object({
  title: z.string().min(1),
  publishedAt: z.coerce.date(),
  status: exampleStatusSchema.optional(),
});
export type CreateBookInput = z.infer<typeof createBookSchema>;

// Response shape. The serializer runs every response through this, so any
// column not listed here is stripped before it leaves the API.
export const bookSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  status: exampleStatusSchema,
  publishedAt: z.date(),
});

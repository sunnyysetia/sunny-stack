import type { RouterOutputs } from '@/api/trpc/types';

export type Book = RouterOutputs['books']['listPublic'][number];

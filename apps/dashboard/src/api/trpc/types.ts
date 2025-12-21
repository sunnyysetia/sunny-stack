import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

import type { AppRouter } from '../../../../api/src/trpc/public'; // type-only export

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

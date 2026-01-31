import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from 'better-auth';

import { AuthGuardRequest } from '../guards/auth.guard';

export const CurrentUser = createParamDecorator(
  (field: keyof User | undefined, ctx: ExecutionContext) => {
    const request: AuthGuardRequest = ctx.switchToHttp().getRequest();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);

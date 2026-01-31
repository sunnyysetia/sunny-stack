import { Inject, Injectable } from '@nestjs/common';
import type { Auth } from 'better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';

import { BETTER_AUTH } from './better-auth/constants';

@Injectable()
export class AuthSessionService {
  constructor(@Inject(BETTER_AUTH) private readonly betterAuth: Auth) {}

  async getSession(req: Request) {
    // Better Auth expects Web Headers.
    // fromNodeHeaders converts Express req.headers appropriately.
    return this.betterAuth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
  }
}

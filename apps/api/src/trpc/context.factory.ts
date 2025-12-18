import { Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import { DB_CONNECTION } from '@/core/database/database.constants';
import type { Database } from '@/core/database';
import { AuthSessionService } from '@/modules/auth/auth-session.service';

import type { Session, User } from 'better-auth';

export type TrpcContext = {
  db: Database;
  session: Session | null;
  user: User | null;
};

@Injectable()
export class TrpcContextFactory {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: Database,
    private readonly authSessions: AuthSessionService,
  ) {}

  async create(req: Request): Promise<TrpcContext> {
    const sessionResult = await this.authSessions.getSession(req);

    return {
      db: this.db,
      session: sessionResult?.session ?? null,
      user: sessionResult?.user ?? null,
    };
  }
}

import { TRPCError } from '@trpc/server';

export type AppErrorCode = 'BOOK_TITLE_TAKEN' | 'ORG_REQUIRED' | 'PAYWALLED' | 'RATE_LIMITED';

export class AppError extends Error {
  constructor(
    public readonly appCode: AppErrorCode,
    message?: string,
    public readonly field?: string,
  ) {
    super(message ?? appCode);
    this.name = 'AppError';
  }
}

// Helper to reduce boilerplate at call sites
export function throwAppError(opts: {
  trpcCode: TRPCError['code'];
  appCode: AppErrorCode;
  message: string;
  field?: string;
}): never {
  throw new TRPCError({
    code: opts.trpcCode,
    message: opts.message, // must be safe for end users
    cause: new AppError(opts.appCode, opts.message, opts.field),
  });
}

import { TRPCError } from '@trpc/server';

export type AppErrorCode = 'BOOK_TITLE_TAKEN';

// A semantic, client-inferable error. `appCode` is a stable machine code the
// dashboard switches on; `field` targets a form field; `data` carries extra
// structured payload (surfaced to the client via the errorFormatter in trpc.ts).
export class AppError extends Error {
  constructor(
    public readonly appCode: AppErrorCode,
    message?: string,
    public readonly field?: string,
    public readonly data?: Record<string, unknown>,
  ) {
    super(message ?? appCode);
    this.name = 'AppError';
  }
}

// Helper to reduce boilerplate at call sites.
export function throwAppError(opts: {
  trpcCode: TRPCError['code'];
  appCode: AppErrorCode;
  message: string;
  field?: string;
  data?: Record<string, unknown>;
}): never {
  throw new TRPCError({
    code: opts.trpcCode,
    message: opts.message, // must be safe for end users
    cause: new AppError(opts.appCode, opts.message, opts.field, opts.data),
  });
}

const PG_ERROR_CODE = {
  UNIQUE_CONSTRAINT: '23505',
  //   FOREIGN_KEY: '23503',
  //   NOT_NULL: '23502',
  //   CHECK_CONSTRAINT: '23514',
  //   SERIALIZATION_FAILURE: '40001',
  //   DEADLOCK: '40P01',
} as const;

export function isDbError(
  err: unknown,
  kind: keyof typeof PG_ERROR_CODE,
  //   opts?: { constraint?: string },
): boolean {
  if (!err || typeof err !== 'object') return false;

  const e = err as {
    cause?: {
      code?: string;
      constraint?: string;
    };
  };

  const code = e.cause?.code;

  if (code !== PG_ERROR_CODE[kind]) return false;

  // Optional: only if you want to target a specific unique constraint.
  //   if (opts?.constraint) {
  //     return e.cause?.constraint === opts.constraint;
  //   }

  return true;
}

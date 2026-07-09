import { describe, expect, it } from 'vitest';

import { isDbError } from '../error';

// node-postgres surfaces the driver error under `.cause` (drizzle wraps it), so
// isDbError reads `err.cause.code` / `err.cause.constraint`.
const uniqueViolation = (constraint?: string) => ({
  cause: { code: '23505', constraint },
});

describe('isDbError', () => {
  it('matches a unique-constraint violation by code', () => {
    expect(isDbError(uniqueViolation(), 'UNIQUE_CONSTRAINT')).toBe(true);
  });

  it('returns false when the code does not match', () => {
    expect(isDbError({ cause: { code: '23503' } }, 'UNIQUE_CONSTRAINT')).toBe(false);
  });

  it('returns false for non-error inputs', () => {
    expect(isDbError(null, 'UNIQUE_CONSTRAINT')).toBe(false);
    expect(isDbError('boom', 'UNIQUE_CONSTRAINT')).toBe(false);
    expect(isDbError({}, 'UNIQUE_CONSTRAINT')).toBe(false);
  });

  it('narrows to a named constraint when one is given', () => {
    expect(
      isDbError(uniqueViolation('book_title_unique'), 'UNIQUE_CONSTRAINT', {
        constraint: 'book_title_unique',
      }),
    ).toBe(true);
    expect(
      isDbError(uniqueViolation('other_unique'), 'UNIQUE_CONSTRAINT', {
        constraint: 'book_title_unique',
      }),
    ).toBe(false);
  });
});

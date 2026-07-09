import { describe, expect, it } from 'vitest';

import { assertNever } from '../assert-never.js';

describe('assertNever', () => {
  it('throws, including the offending value, by default', () => {
    expect(() => assertNever('oops' as never)).toThrow('oops');
  });

  it('uses a custom message when provided', () => {
    expect(() => assertNever('x' as never, 'unhandled kind')).toThrow('unhandled kind');
  });
});

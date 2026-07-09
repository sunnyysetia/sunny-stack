import { describe, expect, it } from 'vitest';

import { blankToNull, firstNonBlank } from '../blank.js';

describe('blankToNull', () => {
  it('returns null for null, undefined, empty and whitespace-only', () => {
    expect(blankToNull(null)).toBeNull();
    expect(blankToNull(undefined)).toBeNull();
    expect(blankToNull('')).toBeNull();
    expect(blankToNull('   ')).toBeNull();
  });

  it('trims and returns a non-blank value', () => {
    expect(blankToNull('  Jane  ')).toBe('Jane');
  });
});

describe('firstNonBlank', () => {
  it('skips blank candidates and returns the first real one', () => {
    // The bug this guards: a blank wire name must not mask the email.
    expect(firstNonBlank('', '  ', 'hello@example.com')).toBe('hello@example.com');
  });

  it('returns the first value when it is non-blank', () => {
    expect(firstNonBlank('Jane Doe', 'jane@example.com')).toBe('Jane Doe');
  });

  it('returns undefined when every candidate is blank', () => {
    expect(firstNonBlank(null, undefined, '', '   ')).toBeUndefined();
  });
});

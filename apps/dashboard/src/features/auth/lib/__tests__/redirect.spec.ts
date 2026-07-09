import { describe, expect, it } from 'vitest';

import { captureReturnTo, normalizeRedirectTarget } from '../redirect';

describe('captureReturnTo', () => {
  it('drops a stale `error` param so it cannot poison the return trip', () => {
    expect(captureReturnTo({ pathname: '/', searchStr: '?error=INVALID_TOKEN', hash: '' })).toBe(
      '/',
    );
  });

  it('strips `error` while preserving real destination query', () => {
    expect(
      captureReturnTo({ pathname: '/books', searchStr: '?error=INVALID_TOKEN&bucket=open' }),
    ).toBe('/books?bucket=open');
  });

  it('preserves a legitimate deep-link path, query, and hash', () => {
    // TanStack's ParsedLocation.hash has no leading `#` — `captureReturnTo`
    // re-adds it so the reconstructed target is a valid URL.
    expect(
      captureReturnTo({ pathname: '/books', searchStr: '?status=open', hash: 'timeline' }),
    ).toBe('/books?status=open#timeline');
  });

  it('returns a relative path only — never an absolute href (no open-redirect surface)', () => {
    // Even if a caller passed odd input, the output is anchored to pathname.
    expect(captureReturnTo({ pathname: '/settings' })).toBe('/settings');
  });

  it('falls back to root for an empty location', () => {
    expect(captureReturnTo({ pathname: '', searchStr: '', hash: '' })).toBe('/');
  });
});

describe('normalizeRedirectTarget', () => {
  it('passes a relative app path through', () => {
    expect(normalizeRedirectTarget('/books?status=open')).toBe('/books?status=open');
  });

  it('defaults when empty or undefined', () => {
    expect(normalizeRedirectTarget(undefined)).toBe('/');
    expect(normalizeRedirectTarget('')).toBe('/');
  });

  it('rejects a non-http scheme', () => {
    expect(normalizeRedirectTarget('javascript:alert(1)')).toBe('/');
  });

  it('collapses a protocol-relative host to a path (no open redirect)', () => {
    expect(normalizeRedirectTarget('//evil.com/path')).toBe('/path');
  });

  it('blocks an open redirect smuggled through dot-segments', () => {
    // `/..//evil.com` collapses to a pathname of `//evil.com`, which resolves
    // off-origin to https://evil.com when handed to navigate/redirect `href`.
    expect(normalizeRedirectTarget('/..//evil.com')).toBe('/');
    expect(normalizeRedirectTarget('/%2e%2e//evil.com')).toBe('/');
    expect(normalizeRedirectTarget('/path/../..//evil.com')).toBe('/');
  });
});

const DEFAULT_REDIRECT = '/';

const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//;

// Query params that are transient signals, never a navigation destination, so
// they must never ride along into a post-sign-in return target. `error` is the
// one that bites: an `?error=…` left in the URL (e.g. a stale tab from an old
// email-link flow) would otherwise be captured as the `redirect`, survive the
// sign-in round-trip, and reappear after login. We strip at the capture site
// (below) so the param can't enter the flow in the first place.
const RESERVED_PARAMS = ['error'];

function cleanTarget(pathname: string, search: URLSearchParams, hash: string): string {
  // A pathname beginning with `//` is protocol-relative and resolves OFF-ORIGIN
  // when handed to redirect/navigate `href` — e.g. `/..//evil.com` collapses to
  // a pathname of `//evil.com`, which the browser loads as `https://evil.com`.
  // Never a legitimate in-app target, so bail to the safe default. This is the
  // single chokepoint for both captureReturnTo and normalizeRedirectTarget.
  if (pathname.startsWith('//')) return DEFAULT_REDIRECT;
  const qs = search.toString();
  return `${pathname}${qs ? `?${qs}` : ''}${hash}` || DEFAULT_REDIRECT;
}

/**
 * Build the `redirect` search param when bouncing an unauthenticated user to
 * /sign-in: capture *where they were trying to go*, as a safe relative path.
 *
 * Relative (pathname + own query + hash, never the absolute `href`) so it can't
 * become an open redirect, and with reserved signal params stripped so a stray
 * `?error=…` can't poison the return trip. The matching `normalizeRedirectTarget`
 * sanitises again on the way out as defence in depth.
 */
export function captureReturnTo(location: {
  pathname: string;
  searchStr?: string;
  hash?: string;
}): string {
  const search = new URLSearchParams(location.searchStr ?? '');
  for (const param of RESERVED_PARAMS) search.delete(param);
  // TanStack's `location.hash` omits the leading `#` (unlike `URL.hash`, which
  // `normalizeRedirectTarget` feeds `cleanTarget`); re-add it so the two callers
  // hand `cleanTarget` the same convention.
  const hash = location.hash ? `#${location.hash}` : '';
  return cleanTarget(location.pathname, search, hash);
}

export function normalizeRedirectTarget(redirect?: string): string {
  if (!redirect) return DEFAULT_REDIRECT;

  const value = redirect.trim();
  if (!value) return DEFAULT_REDIRECT;

  if (value.startsWith('/')) {
    // Parse against a throwaway base so relative `//host` inputs collapse to a
    // path (the reconstruction drops the host) rather than acting as an open
    // redirect.
    const url = new URL(value, 'http://localhost');
    return cleanTarget(url.pathname, url.searchParams, url.hash);
  }

  if (!ABSOLUTE_URL_PATTERN.test(value)) return DEFAULT_REDIRECT;

  try {
    const url = new URL(value);

    if (typeof location !== 'undefined' && url.origin !== location.origin) {
      return DEFAULT_REDIRECT;
    }

    return cleanTarget(url.pathname, url.searchParams, url.hash);
  } catch {
    return DEFAULT_REDIRECT;
  }
}

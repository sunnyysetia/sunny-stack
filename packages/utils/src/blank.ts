/**
 * Treat blank strings as absent.
 *
 * Wire data (MIME headers, external APIs, imported records) routinely
 * carries an empty or whitespace-only display name. JS `??` only falls
 * through on `null`/`undefined`, so `name ?? email` keeps a `""` and never
 * reaches the fallback. These helpers collapse blank to absent so the usual
 * coalescing chains behave.
 */

/** A string trimmed, or `null` when it is empty/whitespace-only/absent. */
export function blankToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** First non-blank value (trimmed), or `undefined` when all are blank. */
export function firstNonBlank(...values: (string | null | undefined)[]): string | undefined {
  for (const value of values) {
    const trimmed = blankToNull(value);
    if (trimmed !== null) return trimmed;
  }
  return undefined;
}

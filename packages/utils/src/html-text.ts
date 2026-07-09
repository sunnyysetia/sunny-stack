import { convert } from 'html-to-text';

/**
 * Convert an HTML email body to canonical plain text.
 *
 * The single source of truth for "what is the plain-text form of this
 * HTML body", used on every side of the wire:
 *  - inbound — populates the stored body when a message arrives HTML-only
 *    (no text/plain MIME part);
 *  - outbound — downconverts the composed HTML body for the stored plain
 *    text and the multipart email's text/plain alternative part;
 *  - client — derives the optimistic timeline entry's body so it matches
 *    what the backend will persist (no drift).
 *
 * Paragraph breaks and inline link URLs are kept (readable + searchable);
 * images / tracking pixels are dropped; no hard wrapping.
 *
 * Headings keep their authored case. `html-to-text` UPPERCASES `<h1>`–
 * `<h6>` by default, which shouted template headings in the plain-text
 * email part and in every snippet preview even though the HTML renders
 * them in normal case — so we turn that off.
 */
export function htmlBodyToText(html: string): string {
  return convert(html, {
    wordwrap: false,
    selectors: [
      { selector: 'img', format: 'skip' },
      { selector: 'a', options: { ignoreHref: false } },
      { selector: 'h1', options: { uppercase: false } },
      { selector: 'h2', options: { uppercase: false } },
      { selector: 'h3', options: { uppercase: false } },
      { selector: 'h4', options: { uppercase: false } },
      { selector: 'h5', options: { uppercase: false } },
      { selector: 'h6', options: { uppercase: false } },
    ],
  }).trim();
}

/**
 * Collapse plain text to a single-line snippet, truncated with an
 * ellipsis when longer than `maxLen`. Input must already be plain text
 * (run it through `htmlBodyToText` first if it might contain markup).
 */
export function toSnippet(text: string, maxLen: number): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

/**
 * One-line glance snippet of an HTML body — `htmlBodyToText` followed by
 * `toSnippet`. Use on surfaces that hold raw HTML and want a preview that
 * matches the stored plain-text body.
 */
export function htmlToSnippet(html: string, maxLen = 200): string {
  return toSnippet(htmlBodyToText(html), maxLen);
}

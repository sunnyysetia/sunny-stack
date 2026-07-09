import { describe, expect, it } from 'vitest';

import { htmlBodyToText, htmlToSnippet, toSnippet } from '../html-text.js';

describe('htmlBodyToText', () => {
  it('strips tags and keeps paragraph breaks', () => {
    expect(htmlBodyToText('<p>Hi Sam,</p><p>No problem.</p>')).toBe('Hi Sam,\n\nNo problem.');
  });

  it('keeps the URL of a link', () => {
    expect(htmlBodyToText('<p>Apply <a href="https://example.com/x">here</a>.</p>')).toContain(
      'https://example.com/x',
    );
  });

  it('drops images', () => {
    expect(htmlBodyToText('<p>see<img src="https://x/y.png" alt="logo"></p>')).toBe('see');
  });

  it('leaves a plain-text body untouched', () => {
    expect(htmlBodyToText('just text')).toBe('just text');
  });

  it('keeps headings in their authored case (no uppercasing)', () => {
    // html-to-text uppercases <h1>-<h6> by default; we disable that so the
    // plain-text body and snippet previews match the rendered HTML.
    expect(htmlBodyToText('<h1>Welcome Aboard</h1><p>Hi Kanaya,</p>')).toBe(
      'Welcome Aboard\n\nHi Kanaya,',
    );
    expect(htmlToSnippet('<h1>Welcome Aboard</h1><p>Hi Kanaya,</p>')).toBe(
      'Welcome Aboard Hi Kanaya,',
    );
  });
});

describe('toSnippet', () => {
  it('collapses whitespace', () => {
    expect(toSnippet('a   b\n\nc', 50)).toBe('a b c');
  });

  it('truncates with an ellipsis when over maxLen', () => {
    const out = toSnippet('a'.repeat(300), 50);
    expect(out.length).toBe(50);
    expect(out.endsWith('…')).toBe(true);
  });

  it('leaves short text untruncated', () => {
    expect(toSnippet('short', 50)).toBe('short');
  });
});

describe('htmlToSnippet', () => {
  it('strips tags and collapses whitespace from a paragraph', () => {
    expect(htmlToSnippet('<p>Hi <strong>Sam</strong></p>')).toBe('Hi Sam');
  });

  it('renders list items with bullet markers', () => {
    expect(htmlToSnippet('<ul><li>one</li><li>two</li></ul>')).toBe('* one * two');
  });

  it('decodes common entities', () => {
    expect(htmlToSnippet('<p>Smith &amp; Jones</p>')).toBe('Smith & Jones');
    expect(htmlToSnippet('<p>1 &lt; 2 &gt; 0</p>')).toBe('1 < 2 > 0');
    expect(htmlToSnippet('<p>&quot;quoted&quot; &#39;s&#39;</p>')).toBe(`"quoted" 's'`);
    expect(htmlToSnippet('<p>a&nbsp;b</p>')).toBe('a b');
  });

  it('converts <br> to a space', () => {
    expect(htmlToSnippet('<p>line one<br/>line two</p>')).toBe('line one line two');
    expect(htmlToSnippet('<p>line one<br>line two</p>')).toBe('line one line two');
  });

  it('truncates with an ellipsis when over maxLen', () => {
    const out = htmlToSnippet(`<p>${'a'.repeat(300)}</p>`, 50);
    expect(out.length).toBe(50);
    expect(out.endsWith('…')).toBe(true);
  });

  it('leaves short text untruncated', () => {
    expect(htmlToSnippet('<p>short</p>', 50)).toBe('short');
  });
});

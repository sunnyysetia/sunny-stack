// Shared layout for platform (transactional) emails — sign-in codes, member
// invitations, system notifications. One table-based shell keeps every email
// visually consistent and renders reliably across email clients (no external
// CSS, no flexbox/grid, inline styles only).
//
// Genericised starter styling — swap the palette / wordmark for your brand.

const BG = '#F4F4F5'; // page background
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#E4E4E7';
const BORDER = '#E4E4E7';
const INK = '#18181B'; // headings + wordmark
const BODY = '#52525B'; // body copy
const MUTED = '#71717A'; // key/value labels
const FAINT = '#A1A1AA'; // fine print
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

// Product/brand name shown as the header wordmark (real text, so it reads
// correctly with images disabled).
const BRAND = 'App';

export const EMAIL_FINEPRINT_STYLE = `margin:20px 0 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${FAINT}`;

/** HTML-escape a value before interpolating it into an email body. */
export function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * A full-width filled dark primary button. `href` is interpolated raw — only
 * ever pass your own URLs (never user input). `label` is escaped.
 */
export function emailButton(href: string, label: string): string {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0">` +
    `<tr><td bgcolor="${INK}" align="center" style="border-radius:8px">` +
    `<a href="${href}" target="_blank" ` +
    `style="display:block;padding:11px 20px;font-family:${FONT};font-size:14px;` +
    `font-weight:600;line-height:1.3;color:#FFFFFF;text-decoration:none;border-radius:8px">` +
    `${escapeEmailHtml(label)}</a>` +
    `</td></tr></table>`
  );
}

/**
 * A one-time code, rendered as a large wide-set monospace block. `code` is
 * digits only (no user input), so each character is interpolated raw. The
 * per-character margin (not `letter-spacing`) keeps the copy selection tight.
 */
export function emailOtpCode(code: string): string {
  const digits = [...code]
    .map(
      (ch) =>
        `<span style="display:inline-block;margin:0 4px;font-family:${MONO};font-size:32px;` +
        `font-weight:600;letter-spacing:normal;color:${INK}">${ch}</span>`,
    )
    .join('');
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0">` +
    `<tr><td align="center" style="padding:16px;border:1px solid ${BORDER};border-radius:8px;background:${BG}">` +
    digits +
    `</td></tr></table>`
  );
}

/** Simple key/value block for notification emails. */
export function emailKeyValues(rows: { label: string; value: string }[]): string {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 0">` +
    rows
      .map(
        (r) =>
          `<tr>` +
          `<td style="padding:6px 0;font-family:${FONT};font-size:13px;color:${MUTED};border-bottom:1px solid ${BORDER}">${escapeEmailHtml(r.label)}</td>` +
          `<td style="padding:6px 0;font-family:${FONT};font-size:13px;color:${INK};text-align:right;border-bottom:1px solid ${BORDER}">${escapeEmailHtml(r.value)}</td>` +
          `</tr>`,
      )
      .join('') +
    `</table>`
  );
}

/**
 * Wrap body HTML in the shared shell (header wordmark + card + preheader).
 * `bodyHtml` is trusted markup (built by the helpers above) — never pass
 * unescaped user input.
 */
export function renderPlatformEmail(opts: {
  preheader: string;
  heading: string;
  bodyHtml: string;
}): string {
  return (
    `<!doctype html><html><body style="margin:0;padding:0;background:${BG}">` +
    // Preheader: hidden preview text.
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeEmailHtml(opts.preheader)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};padding:32px 0">` +
    `<tr><td align="center">` +
    `<table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:480px;max-width:92%">` +
    `<tr><td style="padding:0 0 20px;font-family:${FONT};font-size:18px;font-weight:700;color:${INK}">${BRAND}</td></tr>` +
    `<tr><td style="background:${CARD_BG};border:1px solid ${CARD_BORDER};border-radius:12px;padding:28px">` +
    `<h1 style="margin:0 0 12px;font-family:${FONT};font-size:20px;font-weight:600;color:${INK}">${escapeEmailHtml(opts.heading)}</h1>` +
    `<div style="font-family:${FONT};font-size:14px;line-height:1.6;color:${BODY}">${opts.bodyHtml}</div>` +
    `</td></tr></table>` +
    `</td></tr></table>` +
    `</body></html>`
  );
}

/** The sign-in one-time-code email (subject + text + html). */
export function buildSignInCodeEmail(code: string): {
  subject: string;
  text: string;
  html: string;
} {
  return {
    subject: `Your sign-in code: ${code}`,
    text: `Your sign-in code is ${code}. It expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
    html: renderPlatformEmail({
      preheader: `Your sign-in code is ${code}`,
      heading: 'Sign in',
      bodyHtml:
        `<p style="margin:0">Use this one-time code to finish signing in. It expires in 10 minutes.</p>` +
        emailOtpCode(code) +
        `<p style="${EMAIL_FINEPRINT_STYLE}">If you didn't request this, you can safely ignore this email.</p>`,
    }),
  };
}

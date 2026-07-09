import { type CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Phone number — the single source of truth for parsing,
// validation, and E.164 normalization across the whole codebase.
//
// One engine (`libphonenumber-js`) feeds three consumers:
//   • zod schemas (`phoneSchema` / `optionalPhoneSchema`) — form +
//     tRPC input validation (block-invalid).
//   • the `<PhoneInput>` component (presentation; emits the value these
//     schemas validate).
//   • sync/import paths — `toE164` normalizes numbers to the same shape.
//
// Keep this pure — no DB, no network. Default region is AU,
// parameterised per-call.
// ─────────────────────────────────────────────────────────────

export type { CountryCode };

/** Default region used to parse local (non-`+`-prefixed) numbers. */
export const DEFAULT_PHONE_COUNTRY: CountryCode = 'AU';

export interface ParsedPhone {
  /** Canonical E.164 form, e.g. `+61412345678`. */
  e164: string;
  /** Detected/assumed region, e.g. `AU`. May be undefined for some numbers. */
  country: CountryCode | undefined;
  /** Whether `libphonenumber-js` considers the number valid for its region. */
  isValid: boolean;
}

/**
 * Parse a raw phone string. Returns the parsed shape (even when the number
 * is merely possible but not strictly valid, with `isValid: false`), or
 * `null` when the input can't be parsed into a number at all. Local numbers
 * (no `+`) are interpreted in `country`.
 */
export function parsePhone(
  input: string,
  country: CountryCode = DEFAULT_PHONE_COUNTRY,
): ParsedPhone | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parsed = parsePhoneNumberFromString(trimmed, country);
  if (!parsed) return null;
  return { e164: parsed.format('E.164'), country: parsed.country, isValid: parsed.isValid() };
}

/** `true` iff `input` is a valid phone number for `country` (or its own `+` prefix). */
export function isValidPhone(input: string, country: CountryCode = DEFAULT_PHONE_COUNTRY): boolean {
  return parsePhone(input, country)?.isValid ?? false;
}

/**
 * Certify a number into canonical E.164, or `null` if it isn't a strictly
 * valid dialable number. THE single entry point for any phone that arrives
 * from an external source (sync, import, webhook, manual entry) — run
 * everything through here so storage, comparison, and lookup all agree on
 * one shape.
 *
 * Contract (default region AU):
 *   • Local numbers are interpreted in `country`; the national trunk `0` is
 *     dropped, so `0479 010 200` → `+61479010200` (NOT `+610479010200`).
 *   • A `+`-prefixed number keeps its own country regardless of `country`.
 *   • Output is byte-for-byte what `libphonenumber-js` emits for the same
 *     number, so ids derived from an E.164 line up across inbound webhooks
 *     and our own stored contacts.
 *   • Returns `null` for anything not strictly valid — we never persist a
 *     half-parsed number. If you need the lenient "format whatever parses"
 *     behaviour, read `parsePhone(...).e164` directly.
 */
export function toE164(
  input: string | null | undefined,
  country: CountryCode = DEFAULT_PHONE_COUNTRY,
): string | null {
  if (!input) return null;
  const parsed = parsePhone(input, country);
  return parsed?.isValid ? parsed.e164 : null;
}

/**
 * Required, block-invalid phone field. Trims, validates against
 * `libphonenumber-js` (default region AU for local numbers), and outputs the
 * canonical E.164 string. Rejects anything not strictly valid.
 *
 * Transform preserves the type (`string` → `string`) so `z.input` ===
 * `z.output`, which keeps `react-hook-form`'s resolver typing happy.
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone number is required')
  // Validate + certify to E.164 in one transform. `toE164` returns null for an
  // invalid number, so we surface that as the issue and bail with `z.NEVER` —
  // which makes the output type `string` (never `string | null`) WITHOUT a type
  // assertion. (A trailing `as string` gets stripped by lint's
  // no-unnecessary-type-assertion, regressing the output to `string | null`.)
  .transform((v, ctx) => {
    const e164 = toE164(v);
    if (e164 === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid phone number' });
      return z.NEVER;
    }
    return e164;
  });

/**
 * Optional phone field for **react-hook-form** forms backed by `<PhoneInput>`
 * (which already emits E.164). Validation only — empty is allowed, a non-empty
 * value must be valid. No type-changing transform, so `z.input` === `z.output`
 * (`string | undefined`) and the resolver typing stays clean. The component
 * supplies E.164; normalization-to-canonical happens server-side via
 * `nullablePhoneSchema`. Convert `'' → null` at submit (`value || null`).
 */
export const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || isValidPhone(v), { message: 'Enter a valid phone number' })
  .optional();

/**
 * Optional/nullable phone for **tRPC inputs + storage**. Accepts string /
 * null / undefined / `''`, validates, and normalizes to canonical E.164 — or
 * `null` when empty. Use on the server side where there's no react-hook-form
 * resolver to keep happy, so the stored value is always canonical regardless
 * of what a client sends.
 */
export const nullablePhoneSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null ? '' : v.trim()))
  .refine((v) => v === '' || isValidPhone(v), { message: 'Enter a valid phone number' })
  .transform((v) => (v === '' ? null : toE164(v)));

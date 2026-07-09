import { z } from 'zod';

/**
 * ISO 8601 date-time strings with milliseconds precision and UTC timezone.
 * Example: 2026-01-15T12:00:00.000Z
 *
 * Python:
 *   def now_iso_utc_ms() -> str:
 *       return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
 *
 * JavaScript:
 *   const nowIsoUtcMs = () => new Date().toISOString();
 */
export const isoUtcMsSchema = z.iso.datetime({ precision: 3 });

/** `true` iff `A` and `B` are mutually assignable (same union of members). */
export type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * Compile-time assertion that a condition is `true` — pairs with `Equals`
 * to pin a hand-written discriminated union's `kind` to its source enum
 * tuple so they can't silently drift:
 *   type _ = AssertTrue<Equals<Actor['kind'], ActorKind>>;
 * A mismatch makes `Equals` resolve to `false`, which violates the
 * `T extends true` constraint and fails to compile.
 */
export type AssertTrue<T extends true> = T;

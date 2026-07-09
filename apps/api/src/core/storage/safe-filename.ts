// Restrict an externally-supplied filename to characters that are safe inside
// an S3 key path segment. Preserves dots so the file extension survives — the
// client reads it for MIME inference, Content-Disposition uses it as the
// suggested download name.
//
// 200-char cap defends against pathologically long filenames blowing past S3's
// key length budget or breaking header limits later.

const MAX_FILENAME_LENGTH = 200;
const UNSAFE_CHARS = /[^A-Za-z0-9._-]+/g;

export function safeFilename(name: string | null | undefined, fallback = 'attachment'): string {
  const base = name && name.trim() ? name.trim() : fallback;
  return base.replace(UNSAFE_CHARS, '_').slice(0, MAX_FILENAME_LENGTH);
}

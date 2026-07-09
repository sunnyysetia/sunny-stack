import * as z from 'zod';

// Validated, typed view of the Vite-injected `import.meta.env`. Parsed once at
// module load so a missing/invalid var fails fast at startup — where it's
// obvious — rather than surfacing as a cryptic error deep in a network call.
const envSchema = z.object({
  // Base URL of the API. Both the tRPC endpoint (`/trpc`) and the better-auth
  // client (`/auth/client`) hang off this. Required.
  VITE_API_BASE_URL: z.url(),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;

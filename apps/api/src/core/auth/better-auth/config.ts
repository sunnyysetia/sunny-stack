import type { BetterAuthOptions } from 'better-auth';
import type { admin, emailOTP, organization } from 'better-auth/plugins';

import { getTrustedOrigins } from '@/config/cors.config';
import { getLogger } from '@/core/logging';
import {
  buildSignInCodeEmail,
  EMAIL_FINEPRINT_STYLE,
  emailButton,
  escapeEmailHtml,
  renderPlatformEmail,
} from '@/core/platform-mail/email-layout';

const logger = getLogger('BetterAuth');

export interface BetterAuthConfig {
  secret: string;
  baseURL: string;
  basePath: string;
}

// Minimal transactional-mail surface the auth flows need. Kept as an
// interface (not a hard import of the concrete service) so the CLI config can
// omit it and the runtime factory can inject the real PlatformMailService.
export interface AuthMailer {
  sendEmail(params: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    reason?: string;
  }): Promise<unknown>;
}

type BetterAuthCliDeps = { isCliMode: true };
type BetterAuthRuntimeDeps = {
  isCliMode: false;
  mailer: AuthMailer;
  dashboardUrl: string;
  // In dev the platform mailer usually isn't configured (no SES creds), so the
  // sign-in code is logged to the server console instead of (or as well as)
  // emailed. See `sendVerificationOTP`.
  isDev: boolean;
};
export type BetterAuthDeps = BetterAuthCliDeps | BetterAuthRuntimeDeps;

// Better Auth plugins are passed in rather than imported directly so that:
// - The app runtime (CJS) can use dynamic `await import()` to avoid bundling
//   issues (see createBetterAuthConfig below).
// - The CLI can use static `import` so the export is a concrete value (not a
//   Promise), which the Better Auth CLI requires to read the config.
// buildBetterAuthConfig stays the single source of truth for auth config.
export interface BetterAuthPlugins {
  admin: typeof admin;
  emailOTP: typeof emailOTP;
  organization: typeof organization;
}

export const buildBetterAuthConfig = ({
  config,
  deps,
  plugins,
}: {
  config: BetterAuthConfig;
  deps: BetterAuthDeps;
  plugins: BetterAuthPlugins;
}) => {
  const { admin, emailOTP, organization } = plugins;
  const isHttps = config.baseURL?.startsWith('https://') ?? false;

  return {
    secret: config.secret,
    baseURL: config.baseURL,
    basePath: config.basePath,
    trustedOrigins: getTrustedOrigins(),

    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
      // Cache the session in a signed cookie to cut DB lookups on hot paths.
      cookieCache: { enabled: true, maxAge: 5 * 60 }, // 5 minutes
    },

    // No `emailAndPassword` — sign-in is one-time-code (OTP) only (see the
    // `emailOTP` plugin below). Passwords don't exist anywhere in the system.

    // Per-IP rate limiting on the auth surface (better-auth is raw-mounted
    // outside the Express front-door limiter, so this is its dedicated guard).
    // In-memory store — correct for a single task. The unauthenticated entry
    // points get tighter caps: OTP request (email-bomb / enumeration) and
    // sign-in (code brute-force, on top of the plugin's per-code attempts).
    rateLimit: {
      enabled: true,
      window: 60, // seconds
      max: 30,
      customRules: {
        '/email-otp/send-verification-otp': { window: 60, max: 5 },
        '/sign-in/email-otp': { window: 60, max: 10 },
      },
    },

    advanced: {
      // Let the DATABASE generate row ids. Every id column defaults to
      // `uuidv7()` (see schema utils.ts / better-auth.ts), so better-auth must
      // NOT generate an id app-side. `'uuid'` would make it insert an
      // app-generated `crypto.randomUUID()` (v4), bypassing the `uuidv7()` DB
      // default and giving auth tables random v4 keys while the rest of the
      // schema uses time-ordered uuidv7. `false` defers to the DB default so
      // all tables share the same index-friendly uuidv7 keys.
      database: { generateId: false },
      // Behind a load balancer the public origin is https. Force the Secure
      // flag rather than relying on origin sniffing. SameSite 'lax' (not
      // 'strict') so cross-site OAuth callbacks still carry the cookie.
      useSecureCookies: isHttps,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isHttps,
      },
      // Key rate limiting on the real client IP — behind a proxy, without this
      // better-auth would see the proxy IP and rate-limit every user as one.
      ipAddress: {
        ipAddressHeaders: ['x-forwarded-for'],
      },
    },

    plugins: [
      // Platform admin (user roles admin/user, impersonation, ban).
      admin(),

      // The only sign-in mechanism: emails a short-lived one-time code.
      // A typed code — unlike a clickable magic link — can't be consumed by
      // email security gateways that pre-fetch/detonate links. Codes are
      // short-lived, attempt-limited, and stored hashed.
      emailOTP({
        otpLength: 6,
        expiresIn: 60 * 10, // 10 minutes
        allowedAttempts: 3,
        storeOTP: 'hashed',
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (deps.isCliMode) return;
          // Only the sign-in flow is wired; guard so a stray trigger can't
          // send a sign-in-worded code for another purpose.
          if (type !== 'sign-in') return;

          // Dev convenience: print the code so you can sign in locally without
          // a configured mailer. `console.log` (not the pino logger) so it
          // shows unbuffered in the terminal. NEVER in production (secret in
          // logs).
          if (deps.isDev) {
            console.log(`\n  🔑 [dev] sign-in code for ${email}: ${otp}\n`);
          }

          try {
            await deps.mailer.sendEmail({
              to: email,
              ...buildSignInCodeEmail(otp),
              reason: 'auth.email_otp',
            });
            logger.info('sign-in code sent');
          } catch (err) {
            // In dev an unconfigured mailer must not block sign-in — the code is
            // in the log above. In prod, a send failure is a real error.
            if (!deps.isDev) throw err;
            logger.warn({ err }, 'sign-in code email failed (dev) — use the logged code');
          }
        },
      }),

      // Multi-tenant organizations (owner / admin / member roles built in).
      organization({
        // One org per user by default — raise/remove for multi-org products.
        organizationLimit: 1,
        invitationExpiresIn: 60 * 60 * 48, // 48h
        sendInvitationEmail: async (data) => {
          if (deps.isCliMode) return;
          const orgName = data.organization.name;
          const inviterName = data.inviter.user.name;
          const acceptUrl = `${deps.dashboardUrl}/accept-invitation/${data.id}`;
          const subject = `${inviterName} invited you to ${orgName}`;
          const text =
            `${inviterName} has invited you to join ${orgName}.\n\n` +
            `Accept your invitation: ${acceptUrl}\n\n` +
            `This link expires in 48 hours.`;
          const html = renderPlatformEmail({
            preheader: `${inviterName} invited you to join ${orgName}.`,
            heading: `Join ${orgName}`,
            bodyHtml:
              `<p style="margin:0"><strong>${escapeEmailHtml(inviterName)}</strong> has invited you to join ` +
              `<strong>${escapeEmailHtml(orgName)}</strong>.</p>` +
              emailButton(acceptUrl, 'Accept invitation') +
              `<p style="${EMAIL_FINEPRINT_STYLE}">This invitation expires in 48 hours.</p>`,
          });
          await deps.mailer.sendEmail({ to: data.email, subject, text, html, reason: 'invite' });
          logger.info({ invitationId: data.id, orgId: data.organization.id }, 'invitation sent');
        },
      }),
    ],
  } satisfies Omit<BetterAuthOptions, 'database'>;
};

// Runtime factory — dynamic-imports the plugins (CJS-safe) and returns the
// config object. `createBetterAuthConfig`'s awaited return type is what
// `types.ts` derives the typed `AppAuth` from.
export const createBetterAuthConfig = async (config: BetterAuthConfig, deps: BetterAuthDeps) => {
  const { admin, emailOTP, organization } = await import('better-auth/plugins');
  return buildBetterAuthConfig({ config, deps, plugins: { admin, emailOTP, organization } });
};

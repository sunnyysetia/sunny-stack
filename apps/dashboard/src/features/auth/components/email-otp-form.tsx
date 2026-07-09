import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@repo/ui/components/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@repo/ui/components/field';
import { Input } from '@repo/ui/components/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  REGEXP_ONLY_DIGITS,
} from '@repo/ui/components/input-otp';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

import { authClient } from '@/api/better-auth/client';
import { sessionQueryOptions } from '@/features/auth/api/queries';

// Shared one-time-code (OTP) sign-in flow. Two steps — request a code for an
// email, then type the code. The whole point of OTP over a magic link is that
// a typed code can't be consumed by email-security gateways that pre-fetch or
// click links, so the user always completes sign-in on their own device.

const CODE_LENGTH = 6;
// Stable element-valued list (not a bare index) so the OTP slots map cleanly.
const OTP_SLOTS = Array.from({ length: CODE_LENGTH }, (_, i) => i);

// Throttle resends client-side. Each new code invalidates the last, so rapid
// resends are how people lock themselves out of a code that did arrive.
const RESEND_COOLDOWN_SECONDS = 30;

const emailSchema = z.object({ email: z.email('Please enter a valid email address.') });
type EmailFormData = z.infer<typeof emailSchema>;

const codeSchema = z.object({
  code: z
    .string()
    .regex(new RegExp(`^\\d{${CODE_LENGTH}}$`), `Enter the ${CODE_LENGTH}-digit code.`),
});
type CodeFormData = z.infer<typeof codeSchema>;

/** Request a sign-in code for an email. Resolves true on success. */
async function sendCode(email: string): Promise<boolean> {
  const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });
  return !error;
}

export function EmailOtpForm({
  presetEmail,
  name,
  onAuthenticated,
  onStepChange,
}: {
  // When set, the email is fixed (e.g. an invite link): skip the email step and
  // auto-send a code on mount. When omitted, the user types their email first.
  presetEmail?: string;
  // Passed to sign-in for first-time registration, so a new `user.name` is set
  // rather than left empty.
  name?: string;
  // Called after the session cookie is set and the session query is refreshed.
  onAuthenticated: () => void | Promise<void>;
  // Reports which of the two steps is showing so a surrounding header can track
  // it (e.g. "Welcome back" → "Check your email"). Optional.
  onStepChange?: (step: 'email' | 'code') => void;
}) {
  const [email, setEmail] = useState<string | null>(presetEmail ?? null);

  // Single source of truth for the step transitions, so the reported step and
  // the rendered step can't drift (vs. syncing through an effect).
  const goToCode = (sent: string) => {
    setEmail(sent);
    onStepChange?.('code');
  };
  const goToEmail = () => {
    setEmail(null);
    onStepChange?.('email');
  };

  if (email === null) {
    return <EmailStep onSent={goToCode} />;
  }

  return (
    <CodeStep
      email={email}
      name={name}
      autoSendOnMount={presetEmail !== undefined}
      onAuthenticated={onAuthenticated}
      // No "use a different email" when the email is fixed by an invite.
      onChangeEmail={presetEmail === undefined ? goToEmail : undefined}
    />
  );
}

function EmailStep({ onSent }: { onSent: (email: string) => void }) {
  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: EmailFormData) => {
    // The send is gated server-side to eligible emails, but always responds
    // success (no account enumeration). A failure here is network/rate-limit.
    if (!(await sendCode(data.email))) {
      form.setError('email', {
        type: 'server',
        message: 'Could not send a sign-in code. Please try again.',
      });
      return;
    }
    onSent(data.email);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <FieldGroup className="gap-5">
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                {...field}
                id="email"
                type="email"
                aria-invalid={fieldState.invalid}
                placeholder="Enter your email"
                autoComplete="email"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Sending code...' : 'Send sign-in code'}
      </Button>
    </form>
  );
}

function CodeStep({
  email,
  name,
  autoSendOnMount,
  onAuthenticated,
  onChangeEmail,
}: {
  email: string;
  name?: string;
  autoSendOnMount: boolean;
  onAuthenticated: () => void | Promise<void>;
  onChangeEmail?: () => void;
}) {
  const queryClient = useQueryClient();
  const [resendNote, setResendNote] = useState<string | null>(null);
  // A code is sent the moment this step appears (typed email or auto-send), so
  // start the cooldown immediately rather than letting an instant resend through.
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const form = useForm<CodeFormData>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  // Auto-send the first code when the email is preset (invite). Ref-guarded so
  // StrictMode's double-mount doesn't fire two emails.
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (!autoSendOnMount || autoSentRef.current) return;
    autoSentRef.current = true;
    void sendCode(email);
  }, [autoSendOnMount, email]);

  const resend = useCallback(async () => {
    setResendNote(null);
    const ok = await sendCode(email);
    if (ok) setCooldown(RESEND_COOLDOWN_SECONDS);
    setResendNote(ok ? 'A new code is on its way.' : 'Could not resend. Try again in a moment.');
  }, [email]);

  const onSubmit = async (data: CodeFormData) => {
    const { error } = await authClient.signIn.emailOtp({
      email,
      otp: data.code,
      ...(name ? { name } : {}),
    });

    if (error) {
      form.setError('code', {
        type: 'server',
        message:
          error.code === 'TOO_MANY_ATTEMPTS'
            ? 'Too many attempts. Request a new code below.'
            : 'That code is incorrect or has expired. Request a new one below.',
      });
      // Clear the boxes so the next attempt starts clean (focus stays on the
      // first slot). The error message persists until the next submit.
      form.setValue('code', '');
      return;
    }

    // Cookie is set; make the app see the session before the caller routes.
    await queryClient.refetchQueries({ queryKey: sessionQueryOptions.queryKey });
    await onAuthenticated();
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-zinc-600">
        Enter the {CODE_LENGTH}-digit code we sent to{' '}
        <strong className="font-medium text-zinc-900">{email}</strong>.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full flex-col gap-6">
        <Controller
          name="code"
          control={form.control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-2">
              <InputOTP
                maxLength={CODE_LENGTH}
                pattern={REGEXP_ONLY_DIGITS}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                // Auto-verify the moment the last digit lands, no extra click.
                onComplete={() => void form.handleSubmit(onSubmit)()}
                autoFocus
                // Span the full card width so the boxes line up with the button
                // below, the same full-width column the email input forms.
                containerClassName="w-full"
              >
                <InputOTPGroup className="w-full gap-2">
                  {OTP_SLOTS.map((slot) => (
                    <InputOTPSlot
                      key={slot}
                      index={slot}
                      aria-invalid={fieldState.invalid}
                      // flex-1 spreads the six slots evenly across the row.
                      className="flex-1"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              {fieldState.error && (
                <p className="text-sm text-destructive">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Verifying...' : 'Continue'}
        </Button>
      </form>

      <div className="flex flex-col items-center gap-1.5 text-center text-sm text-zinc-500">
        <p>
          Didn&apos;t get the code?{' '}
          <button
            type="button"
            className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:font-normal disabled:text-zinc-400 disabled:no-underline disabled:hover:no-underline"
            onClick={() => void resend()}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend it'}
          </button>
          {onChangeEmail && (
            <>
              {' '}
              or{' '}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={onChangeEmail}
              >
                use a different email
              </button>
            </>
          )}
          .
        </p>
        {resendNote && <p className="text-zinc-400">{resendNote}</p>}
      </div>
    </div>
  );
}

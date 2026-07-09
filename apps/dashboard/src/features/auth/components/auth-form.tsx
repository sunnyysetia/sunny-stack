import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import SignIn from './sign-in';

type AuthFormProps = { mode: 'login' } | { mode: 'signup' };

// Passwordless one-time-code is the only flow: a code sign-in registers a new
// user on first use, so "sign in" and "sign up" are the same OTP form under
// different headers. The two routes are kept so links/copy can differ.
const AuthForm = ({ mode }: AuthFormProps) => {
  const isLogin = mode === 'login';

  // The OTP flow has two steps; the header reflects the active one. `null`
  // subtitle on the code step = let the form's own copy carry the detail.
  const [step, setStep] = useState<'email' | 'code'>('email');
  const onCodeStep = step === 'code';

  const title = onCodeStep ? 'Check your email' : isLogin ? 'Welcome back' : 'Create your account';
  const subtitle = onCodeStep
    ? null
    : isLogin
      ? 'Enter your email to continue'
      : 'Enter your email to get started';

  return (
    <div className="flex flex-col gap-8">
      {/* Brand + Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-1.5 select-none">
          <img src="/maple-icon.webp" alt="Sunny" className="h-6 w-6 shrink-0" />
          <span className="text-base font-semibold text-foreground">Sunny</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-semibold text-zinc-900 select-none">{title}</h2>
          {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
        </div>
      </div>

      {/* Form + Footer */}
      <div className="flex flex-col gap-6">
        <SignIn onStepChange={setStep} />

        {/* The cross-flow CTA belongs to the entry step. Once you're verifying a
            code, the toggle is noise, so hide it and keep the screen on its one
            job: typing the code. */}
        {!onCodeStep && (
          <>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-200" />
              <span className="text-sm text-zinc-500">Or</span>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>

            <p className="text-center text-sm text-zinc-600">
              {isLogin ? 'Not using Sunny yet?' : 'Already have an account?'}{' '}
              <Link
                className="inline font-medium text-primary hover:underline"
                to={isLogin ? '/sign-up' : '/sign-in'}
              >
                {isLogin ? 'Create an account' : 'Sign in'}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthForm;

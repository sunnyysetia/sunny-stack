import { useNavigate } from '@tanstack/react-router';

import { EmailOtpForm } from '@/features/auth/components/email-otp-form';
import { normalizeRedirectTarget } from '@/features/auth/lib/redirect';
import { Route as AuthRoute } from '@/routes/_auth/route';

const SignIn = ({
  onStepChange,
}: {
  // Forwarded to the OTP form so the page header can track the step.
  onStepChange?: (step: 'email' | 'code') => void;
}) => {
  const { redirect } = AuthRoute.useSearch();
  const navigate = useNavigate();

  return (
    <EmailOtpForm
      // `href` (not `to`): the redirect target is a fully-built path that can
      // carry a query string/hash (e.g. `/books?tab=all`). TanStack treats
      // `to` as a pathname template and won't parse the query out of it.
      onAuthenticated={() => navigate({ href: normalizeRedirectTarget(redirect) })}
      onStepChange={onStepChange}
    />
  );
};

export default SignIn;

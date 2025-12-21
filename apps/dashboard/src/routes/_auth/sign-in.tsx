import { createFileRoute } from '@tanstack/react-router';

import AuthForm from '@/features/auth/components/auth-form';

export const Route = createFileRoute('/_auth/sign-in')({
  component: RouteComponent,
});

function RouteComponent() {
  return <AuthForm mode="login" />;
}

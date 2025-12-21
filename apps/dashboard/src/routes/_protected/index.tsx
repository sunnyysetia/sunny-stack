import { Button } from '@repo/ui/components/button';
import { createFileRoute } from '@tanstack/react-router';

import { useSignOut } from '@/features/auth/hooks/use-sign-out';

export const Route = createFileRoute('/_protected/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext(); // Available because of layout route
  const signOut = useSignOut();
  return (
    <div>
      userId: {session.user.id}
      <br />
      sessionId: {session.session.id}
      <br />
      <Button
        onClick={async () => {
          await signOut();
        }}
      >
        Sign Out
      </Button>
    </div>
  );
}

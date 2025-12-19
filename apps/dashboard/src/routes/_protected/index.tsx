import { Button } from '@repo/ui/components/button';
import { createFileRoute } from '@tanstack/react-router';

import { useSignOut } from '@/features/auth/hooks/use-sign-out';

export const Route = createFileRoute('/_protected/')({
  component: RouteComponent,
});

function RouteComponent() {
  const signOut = useSignOut();
  return (
    <div>
      Hello "/_protected/"!
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

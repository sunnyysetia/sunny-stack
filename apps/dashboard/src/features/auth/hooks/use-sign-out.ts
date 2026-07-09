import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import { authClient } from '@/api/better-auth/client';

export function useSignOut() {
  const router = useRouter();
  const qc = useQueryClient();

  return async function signOut() {
    const { error } = await authClient.signOut();

    if (error) {
      toast.error(error.message);
      return null;
    }

    // Clear all cached queries so no stale data leaks across sessions.
    qc.clear();

    // Re-run beforeLoad/loader guards so protected routes kick you out.
    await router.invalidate();

    await router.navigate({ to: '/sign-in' });
  };
}

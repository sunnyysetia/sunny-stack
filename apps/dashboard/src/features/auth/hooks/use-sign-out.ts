import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import { authClient } from '@/api/better-auth/client';

import { sessionQueryOptions } from '../api/queries';

export function useSignOut() {
  const router = useRouter();
  const qc = useQueryClient();

  return async function signOut() {
    const { error } = await authClient.signOut();

    // Even if the network fails, you usually still want to clear local auth state
    // so the UI doesn’t keep thinking you are logged in.
    qc.removeQueries({ queryKey: sessionQueryOptions.queryKey });

    // Re-run beforeLoad/loader guards so protected routes kick you out.
    await router.invalidate();

    if (error) {
      toast.error(error.message);
      return null;
    }

    await router.navigate({ to: '/sign-in' });
  };
}

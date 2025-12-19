import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import { authClient } from '@/api/better-auth/client';

import { sessionQueryOptions } from '../api/queries';

export function useSignIn() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return async function signIn(input: { email: string; password: string }) {
    const result = await authClient.signIn.email({
      email: input.email,
      password: input.password,
      rememberMe: true,
    });

    if (result.error) {
      toast.error(result.error.message);
      return null;
    }

    // Refresh cached session, then re-run route guards/loaders that depend on it
    await queryClient.invalidateQueries({ queryKey: sessionQueryOptions.queryKey });
    await router.invalidate();

    return result;
  };
}

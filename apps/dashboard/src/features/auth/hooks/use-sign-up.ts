import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import { authClient } from '@/api/better-auth/client';
import { sessionQueryOptions } from '@/features/auth/api/queries';

export function useSignUp() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return async function signUp(input: { name: string; email: string; password: string }) {
    // Better Auth supports email/password sign up via signUp.email
    const result = await authClient.signUp.email({
      name: input.name,
      email: input.email,
      password: input.password,
    });

    if (result.error) {
      toast.error(result.error.message);
      return null;
    }

    // If your Better Auth config logs the user in after sign-up, this will now succeed

    await queryClient.refetchQueries({ queryKey: sessionQueryOptions.queryKey });
    await router.invalidate();
    return result;
  };
}

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@repo/ui/components/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@repo/ui/components/field';
import { Input } from '@repo/ui/components/input';
import { useNavigate } from '@tanstack/react-router';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import { Route as AuthRoute } from '@/routes/_auth/route';

import { useSignIn } from '../hooks/use-sign-in';

const formSchema = z.object({
  email: z.email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type SignInFormData = z.infer<typeof formSchema>;

const SignIn = () => {
  const navigate = useNavigate();
  const signIn = useSignIn();

  const { redirect } = AuthRoute.useSearch();

  const form = useForm<SignInFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: SignInFormData) => {
    try {
      const result = await signIn(data);
      if (!result) {
        return;
      }

      toast.success('Signed in');
      await navigate({ to: redirect || '/' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      toast.error(message);

      // Optional: set a form-level error
      form.setError('password', { type: 'server', message });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <FieldGroup className="gap-5">
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-2">
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

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-2">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                {...field}
                id="password"
                type="password"
                aria-invalid={fieldState.invalid}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
};

export default SignIn;

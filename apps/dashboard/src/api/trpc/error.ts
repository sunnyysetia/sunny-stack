import { TRPCClientError } from '@trpc/client';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';

import type { AppRouter } from '../../../../api/src/trpc/public'; // type-only import from api

export function isTRPCClientError(cause: unknown): cause is TRPCClientError<AppRouter> {
  return cause instanceof TRPCClientError;
}

type ZodFlatten = {
  fieldErrors: Record<string, Array<string>>;
  formErrors: Array<string>;
};

export function applyTrpcErrorToForm<TValues extends FieldValues>(
  cause: unknown,
  form: UseFormReturn<TValues>,
) {
  if (!isTRPCClientError(cause)) {
    // fallback: unexpected
    form.setError('root' as Path<TValues>, { type: 'server', message: 'Something went wrong.' });
    return;
  }

  // 1) Zod validation errors (input validation)
  const zodError = cause.data?.zodError as ZodFlatten | null | undefined;
  if (zodError?.fieldErrors) {
    for (const [field, messages] of Object.entries(zodError.fieldErrors)) {
      const message = messages[0];
      if (!message) continue;

      form.setError(field as Path<TValues>, { type: 'server', message });
    }
    return;
  }

  // 2) App semantic errors (business logic)
  const appCode = cause.data?.appCode;
  const field = cause.data?.field;

  if (appCode && field) {
    form.setError(field as Path<TValues>, { type: 'server', message: cause.message });
    return;
  }

  // 3) Everything else
  form.setError('root' as Path<TValues>, { type: 'server', message: cause.message });
}

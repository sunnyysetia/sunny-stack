import { TRPCClientError } from '@trpc/client';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';

import type { AppRouter } from '../../../../api/src/trpc/public'; // type-only import from api

export function isTRPCClientError(cause: unknown): cause is TRPCClientError<AppRouter> {
  return cause instanceof TRPCClientError;
}

export function applyTrpcErrorToForm<TValues extends FieldValues>(
  cause: unknown,
  form: UseFormReturn<TValues>,
) {
  if (!isTRPCClientError(cause)) {
    // fallback: unexpected (not even a tRPC error)
    form.setError('root', { type: 'server', message: 'Something went wrong.' });
    return;
  }

  // 1) Zod validation errors (input validation)
  const fieldErrors: Record<string, string[] | undefined> | undefined =
    cause.data?.zodError?.fieldErrors;
  if (fieldErrors) {
    for (const [field, messages] of Object.entries(fieldErrors)) {
      const message = messages?.[0];
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

  // 3) Everything else — an unexpected server error surfaced to a form.
  form.setError('root', { type: 'server', message: cause.message });
}

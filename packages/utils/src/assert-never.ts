/**
 * Exhaustiveness guard for discriminated unions / switch statements.
 *
 * Place it in the `default` branch (or the final `else`) of a switch
 * over a union: once every variant is handled the residual type is
 * `never`, so the call type-checks. Add a variant and forget a branch
 * and TypeScript errors at compile time.
 *
 * Throws at runtime if an unexpected value reaches it anyway — which
 * means the type system was bypassed upstream (e.g. data deserialized
 * from outside TypeScript).
 */
export function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unhandled union member: ${JSON.stringify(value)}`);
}

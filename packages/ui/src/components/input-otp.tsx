import { cn } from '@repo/ui/lib/utils';
import { OTPInput, OTPInputContext } from 'input-otp';
import * as React from 'react';

// Re-exported so consumers can opt into a digit-only pattern without taking a
// direct dependency on `input-otp` (it stays encapsulated in this package).
export { REGEXP_ONLY_DIGITS } from 'input-otp';

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & { containerClassName?: string }) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn('flex items-center gap-2 has-disabled:opacity-50', containerClassName)}
      className={cn('disabled:cursor-not-allowed', className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn('flex items-center gap-2', className)}
      {...props}
    />
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<'div'> & { index: number }) {
  const context = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = context?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      // Mirrors the `Input` primitive's tokens (border-input, bg-input/30,
      // ring on focus) so OTP boxes feel native to the design system.
      className={cn(
        'relative flex h-12 w-12 items-center justify-center rounded-xl border border-input bg-input/30 text-lg font-medium tabular-nums transition-all outline-none',
        'data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-[3px] data-[active=true]:ring-ring/50',
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-pulse bg-foreground" />
        </div>
      )}
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot };

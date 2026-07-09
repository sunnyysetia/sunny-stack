import { cn } from '@repo/ui/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

// Profile-picture avatar. Renders the image when `src` is set; falls back
// to the initials of `name` in a tinted circle otherwise. The component is
// a single source of truth across the dashboard so a future shape change
// (default avatar, ring colour, hover state) lands in one place.

const avatarVariants = cva(
  'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-neutral-700 font-medium',
  {
    variants: {
      size: {
        xs: 'size-4 text-[8px]',
        sm: 'size-5 text-[9px]',
        md: 'size-6 text-[10px]',
        lg: 'size-8 text-xs',
        xl: 'size-12 text-sm',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export interface AvatarProps extends VariantProps<typeof avatarVariants> {
  /** Display name — used to derive initials when no image is set, and as
   *  the `alt` text. */
  name: string;
  /** Presigned image URL. Empty / null → initials fallback. */
  src?: string | null;
  className?: string;
}

export function Avatar({ name, src, size, className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        // `object-top`: anchor the crop to the top so a non-square source
        // (e.g. a head-and-shoulders portrait) frames the face rather than
        // burying it under a centred crop. No-op for square images.
        className={cn(avatarVariants({ size, className }), 'object-cover object-top')}
      />
    );
  }
  return (
    <span className={cn(avatarVariants({ size, className }))} aria-label={name} role="img">
      {initialsOf(name)}
    </span>
  );
}

// Up to two letters: first letter of the first word, first letter of the
// last word. Single-word names get one letter. Empty input → '?'.
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  const initials = (first + last).toUpperCase();
  return initials || '?';
}

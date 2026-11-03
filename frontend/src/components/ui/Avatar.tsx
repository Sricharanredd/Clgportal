/** Avatar — deterministic initials tile (no network images, no layout shift). */
import type { ReactNode } from 'react';

const SIZES = {
  xs: 'h-7 w-7 text-[11px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-[72px] w-[72px] text-2xl',
} as const;

const TONES = [
  'bg-brand-50 text-brand-700 ring-brand-100',
  'bg-accent-50 text-accent-700 ring-accent-100',
  'bg-success-bg text-success ring-success/20',
  'bg-info-bg text-info ring-brand-100',
  'bg-danger-bg text-danger ring-danger/20',
] as const;

export function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function toneFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return TONES[hash % TONES.length];
}

export function Avatar({
  name,
  size = 'md',
  className = '',
  badge,
}: {
  name: string | null | undefined;
  size?: keyof typeof SIZES;
  className?: string;
  /** Small overlay, e.g. an attendance dot. */
  badge?: ReactNode;
}) {
  return (
    <span className={`relative inline-flex shrink-0 rounded-full ${className}`}>
      <span
        aria-hidden
        className={`inline-flex items-center justify-center rounded-full font-bold ring-1 ring-inset ${SIZES[size]} ${toneFor(name ?? '')}`}
      >
        {initialsOf(name)}
      </span>
      {badge ? <span className="absolute -bottom-0.5 -right-0.5">{badge}</span> : null}
    </span>
  );
}

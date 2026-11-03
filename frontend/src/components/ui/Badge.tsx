/**
 * Badge — the single status pill used across the product.
 * `statusBadge()` maps API status strings to a tone + human label so the same
 * status never looks different on two screens.
 */
import type { ReactNode } from 'react';

export type BadgeTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const TONES: Record<BadgeTone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  success: 'bg-success-bg text-success ring-success/20',
  warning: 'bg-warning-bg text-warning ring-warning/20',
  danger: 'bg-danger-bg text-danger ring-danger/20',
  neutral: 'bg-surface-2 text-ink-soft ring-line',
  info: 'bg-info-bg text-info ring-brand-100',
};

const DOTS: Record<BadgeTone, string> = {
  brand: 'bg-brand-500',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-muted',
  info: 'bg-info',
};

export function Badge({
  tone = 'neutral',
  children,
  dot = false,
  className = '',
}: {
  tone?: BadgeTone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${DOTS[tone]}`} aria-hidden /> : null}
      {children}
    </span>
  );
}

/** "not_started" → "Not started"; keeps acronyms such as "AB" intact. */
export function humanize(value: string): string {
  const words = value.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const SUCCESS = new Set([
  'published',
  'submitted',
  'completed',
  'active',
  'paid',
  'cleared',
  'present',
  'done',
  'verified',
  'approved',
]);
const WARNING = new Set(['draft', 'entered', 'pending', 'not started', 'late', 'partial', 'due']);
const DANGER = new Set(['absent', 'reversed', 'overdue', 'failed', 'inactive', 'cancelled', 'expired']);

export function toneForStatus(status: string | null | undefined): BadgeTone {
  const key = (status ?? '').toLowerCase().replace(/_/g, ' ').trim();
  if (!key) return 'neutral';
  if (SUCCESS.has(key)) return 'success';
  if (WARNING.has(key)) return 'warning';
  if (DANGER.has(key)) return 'danger';
  return 'neutral';
}

export function StatusBadge({
  status,
  dot = false,
  className = '',
}: {
  status: string | null | undefined;
  dot?: boolean;
  className?: string;
}) {
  if (!status) return <Badge tone="neutral" className={className}>Unknown</Badge>;
  return (
    <Badge tone={toneForStatus(status)} dot={dot} className={className}>
      {humanize(status)}
    </Badge>
  );
}

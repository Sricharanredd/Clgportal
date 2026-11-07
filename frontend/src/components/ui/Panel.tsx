/**
 * Shared dashboard primitives.
 * `Panel` and `KpiCard` keep their historical props so existing screens
 * (Fees, Results, Parent portal) render with the new visual language.
 */
import type { ReactNode } from 'react';
import { Card, CardHeader } from './Card';
import { StatCard, type StatTone } from './StatCard';

export function Panel({
  title,
  description,
  actions,
  children,
  className = '',
  bodyClassName = '',
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  if (!title) {
    return <Card className={`p-5 ${className}`}>{children}</Card>;
  }
  return (
    <Card className={className}>
      <CardHeader title={title} description={description} actions={actions} />
      <div className={`px-5 py-4 ${bodyClassName}`}>{children}</div>
    </Card>
  );
}

const LEGACY_ACCENTS: Record<string, StatTone> = {
  violet: 'brand',
  periwinkle: 'neutral',
  sage: 'success',
  rose: 'danger',
  peach: 'warning',
};

export function KpiCard({
  label,
  value,
  hint,
  accent = 'violet',
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: keyof typeof LEGACY_ACCENTS;
  icon?: ReactNode;
}) {
  return <StatCard label={label} value={value} hint={hint} icon={icon} tone={LEGACY_ACCENTS[accent] ?? 'brand'} />;
}

/** Small helper: format API datetime strings compactly. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

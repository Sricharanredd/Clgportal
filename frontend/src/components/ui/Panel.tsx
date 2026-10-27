/** Shared dashboard primitives: frosted panel + KPI card. */
import type { ReactNode } from 'react';

export function Panel({
  title,
  actions,
  children,
  className = '',
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass-card rounded-2xl p-5 ${className}`}>
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

const ACCENTS: Record<string, string> = {
  violet: 'from-violet/15 to-transparent border-violet/25',
  rose: 'from-rose/15 to-transparent border-rose/25',
  sage: 'from-sage/15 to-transparent border-sage/25',
  periwinkle: 'from-periwinkle/20 to-transparent border-periwinkle/30',
};

export function KpiCard({
  label,
  value,
  hint,
  accent = 'violet',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: keyof typeof ACCENTS;
}) {
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br to-white/40 p-4 backdrop-blur ${ACCENTS[accent] ?? ACCENTS.violet}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-plum">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
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

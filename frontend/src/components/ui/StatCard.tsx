/** StatCard — KPI tile. Becomes a link (with chevron) when `to` is set. */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export type StatTone = 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

const ICON_TONES: Record<StatTone, string> = {
  brand: 'bg-brand-50 text-brand-600',
  accent: 'bg-accent-50 text-accent-600',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  neutral: 'bg-surface-2 text-ink-soft',
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
  to,
  onClick,
  className = '',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: StatTone;
  to?: string;
  onClick?: () => void;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-muted">{label}</p>
        {icon ? (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-panel ${ICON_TONES[tone]}`}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[26px] font-extrabold leading-none tracking-tight text-ink">{value}</p>
      {hint ? <div className="mt-2 text-[12.5px] leading-5 text-muted">{hint}</div> : null}
      {to || onClick ? (
        <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-600">
          {to ? 'View' : 'Open'}
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      ) : null}
    </>
  );

  const classes = `card group block p-4 text-left transition-[border-color,box-shadow,transform] duration-150 ease-out ${
    to || onClick ? 'hover:border-brand-200 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2' : ''
  } ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {body}
      </button>
    );
  }
  return <div className={classes}>{body}</div>;
}

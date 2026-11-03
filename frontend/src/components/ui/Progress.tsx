/** Progress — linear bar and circular ring for percentages (0–100). */
import type { ReactNode } from 'react';

export type ProgressTone = 'brand' | 'success' | 'warning' | 'danger' | 'accent';

const FILLS: Record<ProgressTone, string> = {
  brand: 'bg-brand-500',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  accent: 'bg-accent-500',
};

const STROKES: Record<ProgressTone, string> = {
  brand: 'stroke-brand-500',
  success: 'stroke-success',
  warning: 'stroke-warning',
  danger: 'stroke-danger',
  accent: 'stroke-accent-500',
};

/** Attendance-style thresholds: ≥85 healthy, ≥70 watch, below that at risk. */
export function toneForPercent(value: number): ProgressTone {
  if (value >= 85) return 'success';
  if (value >= 70) return 'warning';
  return 'danger';
}

export function ProgressBar({
  value,
  tone,
  label,
  size = 'md',
  showValue = false,
  className = '',
}: {
  value: number;
  tone?: ProgressTone;
  label: string;
  size?: 'sm' | 'md';
  showValue?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const resolved = tone ?? toneForPercent(clamped);
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex-1 overflow-hidden rounded-pill bg-line ${size === 'sm' ? 'h-1.5' : 'h-2'}`}
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-pill transition-[width] duration-500 ease-out ${FILLS[resolved]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showValue ? (
        <span className="w-10 shrink-0 text-right text-[12px] font-semibold text-ink-soft">
          {Math.round(clamped)}%
        </span>
      ) : null}
    </div>
  );
}

export function ProgressRing({
  value,
  size = 132,
  stroke = 10,
  label,
  children,
  tone,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  children?: ReactNode;
  tone?: ProgressTone;
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const resolved = tone ?? toneForPercent(clamped);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${Math.round(clamped)} percent`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-line"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-[stroke-dashoffset] duration-700 ease-out ${STROKES[resolved]}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ?? (
          <>
            <span className="text-2xl font-extrabold tracking-tight text-ink">{Math.round(clamped)}%</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
          </>
        )}
      </div>
    </div>
  );
}

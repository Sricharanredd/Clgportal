/**
 * "Needs your attention" — a to-do panel at the top of every dashboard.
 * Each row is a real action with a destination (never a dead number).
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

export interface AttentionItem {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  to: string;
  tone: BadgeTone;
  icon: ReactNode;
}

const TILE: Record<BadgeTone, string> = {
  brand: 'bg-brand-50 text-brand-600',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  neutral: 'bg-surface-2 text-ink-soft',
  info: 'bg-info-bg text-info',
};

export function AttentionPanel({
  items,
  allClearTitle = 'You are all caught up',
  allClearBody = 'Nothing needs your attention right now.',
}: {
  items: AttentionItem[];
  allClearTitle?: string;
  allClearBody?: string;
}) {
  return (
    <section
      className="card overflow-hidden"
      aria-labelledby="attention-heading"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-50 text-brand-600">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <h2 id="attention-heading" className="text-[14px] font-bold text-ink">
            Needs your attention
          </h2>
        </div>
        {items.length > 0 ? (
          <Badge tone="warning" dot>
            {items.length} action{items.length === 1 ? '' : 's'}
          </Badge>
        ) : (
          <Badge tone="success" dot>
            Clear
          </Badge>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-bg text-success">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[13.5px] font-semibold text-ink">{allClearTitle}</p>
            <p className="text-[12.5px] text-muted">{allClearBody}</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-panel ${TILE[item.tone]}`}
                aria-hidden
              >
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-bold text-ink">{item.title}</p>
                <p className="mt-0.5 text-[12.5px] leading-5 text-muted">{item.description}</p>
              </div>
              <Link
                to={item.to}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-control border border-line-strong bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft shadow-xs transition-colors hover:border-brand-400 hover:text-brand-700 sm:self-auto"
              >
                {item.actionLabel}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Shared UI states: loading, empty and error. Every data view uses these so
 * the product never shows a blank screen or a raw exception.
 */
import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, RotateCw } from 'lucide-react';
import { ApiError } from '@/shared/api/client';
import { Button } from './Button';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12" role="status" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-100 border-t-brand-500" />
      <span className="text-sm text-muted">{label ?? 'Loading…'}</span>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  description,
  action,
  icon,
  compact = false,
}: {
  title: string;
  hint?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
}) {
  const body = description ?? hint;
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-panel border border-dashed border-line-strong bg-surface-2/50 text-center ${
        compact ? 'px-4 py-6' : 'px-6 py-10'
      }`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted shadow-xs ring-1 ring-line">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden />}
      </span>
      <div>
        <p className="text-[14px] font-bold text-ink">{title}</p>
        {body ? <p className="mx-auto mt-1 max-w-sm text-[13px] leading-6 text-muted">{body}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function StatePanel({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        {icon}
      </span>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <p className="max-w-md text-sm leading-6 text-muted">{description}</p>
      {action}
    </div>
  );
}

/** Renders an ApiError with its code + request id for supportability. */
export function ErrorState({
  error,
  onRetry,
  title = 'Could not load this page',
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  const api = error instanceof ApiError ? error : null;
  const message =
    api?.message ?? (error instanceof Error ? error.message : 'Something went wrong.');

  return (
    <div
      className="card flex flex-col items-center gap-3 p-8 text-center sm:p-10"
      role="alert"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg text-danger">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <p className="max-w-md text-[13.5px] leading-6 text-muted">{message}</p>
      {api ? (
        <p className="text-[11.5px] text-muted">
          <span className="font-mono">{api.code}</span>
          {api.requestId ? (
            <>
              {' · request '}
              <span className="font-mono">{api.requestId}</span>
            </>
          ) : null}
        </p>
      ) : null}
      {onRetry ? (
        <Button className="mt-2" variant="secondary" icon={<RotateCw className="h-4 w-4" />} onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

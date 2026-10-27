/**
 * Shared UI states: loading spinner, empty state, error panel.
 * Every data view in the app uses these for consistent UX.
 */
import type { ReactNode } from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
import { ApiError } from '@/shared/api/client';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10" role="status" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-periwinkle border-t-violet" />
      {label ? <span className="text-sm text-muted">{label}</span> : null}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="surface flex flex-col items-center gap-2 rounded-2xl p-10 text-center">
      <Inbox className="h-8 w-8 text-muted" aria-hidden />
      <p className="font-medium text-plum">{title}</p>
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function StatePanel({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
      {icon}
      <h2 className="text-lg font-semibold text-plum">{title}</h2>
      <p className="max-w-md text-sm text-muted">{description}</p>
    </div>
  );
}

/** Renders an ApiError with its code + request id for supportability. */
export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const api = error instanceof ApiError ? error : null;
  const message =
    api?.message ?? (error instanceof Error ? error.message : 'Something went wrong.');

  return (
    <div
      className="glass-card flex flex-col items-center gap-3 rounded-2xl p-10 text-center"
      role="alert"
    >
      <AlertTriangle className="h-10 w-10 text-rose" aria-hidden />
      <h2 className="text-lg font-semibold text-plum">Could not load data</h2>
      <p className="max-w-md text-sm text-muted">{message}</p>
      {api ? (
        <p className="text-xs text-muted">
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
        <button type="button" className="btn-primary mt-2" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

/** Skeleton loaders — shapes that match the real content, not blank screens. */
import type { ReactNode } from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`skeleton block ${className}`} aria-hidden />;
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`card p-5 ${className}`} aria-hidden>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-3 h-3 w-40" />
    </div>
  );
}

export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/5" />
          </div>
          <Skeleton className="h-5 w-16 rounded-pill" />
        </div>
      ))}
    </div>
  );
}

/** Whole-page loading state used by data views (header + stats + panels). */
export function PageSkeleton({
  stats = 4,
  panels = 2,
}: {
  stats?: number;
  panels?: number;
}) {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-7 w-64" />
        <Skeleton className="mt-2 h-3 w-80" />
      </div>
      {stats > 0 ? <SkeletonStatGrid count={stats} /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: panels }).map((_, i) => (
          <div key={i} className="card p-5">
            <Skeleton className="h-4 w-32" />
            <SkeletonRows rows={4} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonInline({ children }: { children?: ReactNode }) {
  return <span className="skeleton inline-block h-3 w-12 align-middle">{children}</span>;
}

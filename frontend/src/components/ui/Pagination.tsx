/** Pagination — prev/next plus a compact page-number strip. */
import { ChevronLeft, ChevronRight } from 'lucide-react';

function pageWindow(current: number, total: number): Array<number | 'gap'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: Array<number | 'gap'> = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - (sorted[index - 1] as number) > 1) out.push('gap');
    out.push(page);
  });
  return out;
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  label = 'items',
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12.5px] text-muted" aria-live="polite">
        Showing <span className="font-semibold text-ink-soft">{start}</span>–
        <span className="font-semibold text-ink-soft">{end}</span> of{' '}
        <span className="font-semibold text-ink-soft">{total}</span> {label}
      </p>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-control border border-line bg-surface text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        {pageWindow(page, pageCount).map((item, index) =>
          item === 'gap' ? (
            <span key={`gap-${index}`} className="px-1 text-[12px] text-muted" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-label={`Page ${item}`}
              aria-current={item === page ? 'page' : undefined}
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-control px-2 text-[12.5px] font-semibold transition-colors ${
                item === page
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'border border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink'
              }`}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-control border border-line bg-surface text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </nav>
    </div>
  );
}

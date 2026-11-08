/**
 * DataTable — one table implementation for the product.
 * - sortable headers (controlled)
 * - whole-row link overlay (real anchor → keyboard + middle-click work)
 * - `renderMobileCard` swaps the table for stacked cards under `md`
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

export interface Column<T> {
  id: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  className?: string;
  headerClassName?: string;
  /** Hidden on small screens (table already becomes cards there). */
  hideBelow?: 'sm' | 'md' | 'lg';
}

const HIDE: Record<NonNullable<Column<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
};

const ALIGN: Record<NonNullable<Column<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export interface SortState {
  id: string;
  dir: 'asc' | 'desc';
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowTo,
  rowLabel,
  sort,
  onSortChange,
  renderMobileCard,
  caption,
  footer,
  className = '',
}: {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string | number;
  rowTo?: (row: T) => string;
  rowLabel?: (row: T) => string;
  sort?: SortState;
  onSortChange?: (id: string) => void;
  renderMobileCard?: (row: T) => ReactNode;
  caption?: string;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      {/* Desktop / tablet */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-line bg-gradient-to-r from-brand-50/80 via-surface-2/60 to-surface-2/60">
              {columns.map((column) => {
                const active = sort?.id === column.id;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={
                      active ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={`whitespace-nowrap px-4 py-2.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-muted ${
                      ALIGN[column.align ?? 'left']
                    } ${column.headerClassName ?? ''} ${column.hideBelow ? HIDE[column.hideBelow] : ''}`}
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(column.id)}
                        className={`inline-flex items-center gap-1 rounded transition-colors hover:text-ink ${
                          active ? 'text-ink' : ''
                        }`}
                      >
                        {column.header}
                        {active ? (
                          sort?.dir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" aria-hidden />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-50" aria-hidden />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="group relative transition-colors hover:bg-brand-50/70">
                {columns.map((column, index) => (
                  <td
                    key={column.id}
                    className={`px-4 py-3 align-middle text-ink-soft ${ALIGN[column.align ?? 'left']} ${
                      column.className ?? ''
                    } ${column.hideBelow ? HIDE[column.hideBelow] : ''}`}
                  >
                    {index === 0 && rowTo ? (
                      <>
                        <Link
                          to={rowTo(row)}
                          aria-label={rowLabel ? rowLabel(row) : undefined}
                          className="absolute inset-0 z-0 rounded-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600"
                        />
                        <div className="pointer-events-none relative z-10">{column.render(row)}</div>
                      </>
                    ) : (
                      column.render(row)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      {renderMobileCard ? (
        <ul className="divide-y divide-line md:hidden">
          {rows.map((row) => (
            <li key={rowKey(row)} className="relative">
              {rowTo ? (
                <Link
                  to={rowTo(row)}
                  aria-label={rowLabel ? rowLabel(row) : undefined}
                  className="absolute inset-0 z-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600"
                />
              ) : null}
              <div className="pointer-events-none relative z-10 p-4">{renderMobileCard(row)}</div>
            </li>
          ))}
        </ul>
      ) : null}

      {footer ? <div className="border-t border-line px-4 py-3">{footer}</div> : null}
    </div>
  );
}

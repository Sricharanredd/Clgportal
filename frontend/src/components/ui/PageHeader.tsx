/** PageHeader — the single title block for every screen. */
import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  className = '',
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.09em] text-brand-600">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-ink sm:text-[26px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-[13.5px] leading-6 text-muted">{description}</p>
        ) : null}
        {meta ? <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
    </header>
  );
}

/** Section title used inside a page (not a card header). */
export function SectionTitle({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

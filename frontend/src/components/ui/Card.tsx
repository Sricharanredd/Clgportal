/** Card — the base surface: white, 1px hairline, soft layered shadow. */
import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article' | 'aside';
}) {
  return <Tag className={`card ${className}`}>{children}</Tag>;
}

export function CardHeader({
  title,
  description,
  actions,
  icon,
  className = '',
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 ${className}`}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-panel bg-brand-50 text-brand-600">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold leading-6 text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-[13px] leading-5 text-muted">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`border-t border-line px-5 py-3 ${className}`}>{children}</div>;
}

/** Small inset block used for list rows inside a card. */
export function Inset({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-panel border border-line bg-surface-2/70 ${className}`}>{children}</div>
  );
}

/**
 * Tabs — accessible tab list with arrow-key navigation.
 * `variant="underline"` for page-level sections, `"pill"` for filters.
 */
import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export function Tabs({
  tabs,
  value,
  onChange,
  variant = 'underline',
  label,
  className = '',
}: {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pill';
  label: string;
  className?: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((t) => t.id === value);
    if (index === -1) return;
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    const tab = tabs[next];
    onChange(tab.id);
    refs.current[tab.id]?.focus();
  };

  if (variant === 'pill') {
    return (
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className={`no-scrollbar flex gap-1.5 overflow-x-auto rounded-pill border border-line bg-surface p-1 shadow-xs ${className}`}
      >
        {tabs.map((tab) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                refs.current[tab.id] = node;
              }}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 ${
                active
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'text-ink-soft hover:bg-surface-2 hover:text-ink'
              }`}
            >
              {tab.icon}
              {tab.label}
              {typeof tab.count === 'number' ? (
                <span
                  className={`rounded-pill px-1.5 py-0.5 text-[10.5px] font-bold ${
                    active ? 'bg-white/20 text-white' : 'bg-surface-2 text-muted'
                  }`}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`no-scrollbar flex gap-1 overflow-x-auto border-b border-line ${className}`}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              refs.current[tab.id] = node;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`relative -mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-[13.5px] font-semibold transition-colors duration-150 ${
              active
                ? 'border-brand-500 text-brand-700'
                : 'border-transparent text-muted hover:border-line-strong hover:text-ink'
            }`}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === 'number' ? (
              <span
                className={`rounded-pill px-1.5 py-0.5 text-[10.5px] font-bold ${
                  active ? 'bg-brand-50 text-brand-700' : 'bg-surface-2 text-muted'
                }`}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

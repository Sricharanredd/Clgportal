/**
 * Form primitives — Field (label + hint + error), Input, Select, Textarea,
 * SearchField. All are ref-forwarding so react-hook-form works unchanged.
 */
import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';

const CONTROL =
  'w-full rounded-control border bg-surface px-3 py-2.5 text-sm text-ink shadow-xs ' +
  'transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-muted/85 ' +
  'hover:border-brand-400/70 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 ' +
  'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted';

function controlClass(invalid?: boolean, extra = ''): string {
  return `${CONTROL} ${invalid ? 'border-danger focus:border-danger focus:ring-danger/15' : 'border-line-strong'} ${extra}`;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className = '',
  action,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink-soft">
          {label}
          {required ? (
            <span className="ml-0.5 text-danger" aria-hidden>
              *
            </span>
          ) : null}
        </label>
        {action}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, leading, trailing, className = '', ...rest },
  ref,
) {
  if (!leading && !trailing) {
    return <input ref={ref} className={controlClass(invalid, className)} {...rest} />;
  }
  return (
    <div className="relative">
      {leading ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          {leading}
        </span>
      ) : null}
      <input
        ref={ref}
        className={controlClass(invalid, `${leading ? 'pl-9' : ''} ${trailing ? 'pr-10' : ''} ${className}`)}
        {...rest}
      />
      {trailing ? (
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</span>
      ) : null}
    </div>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ invalid, className = '', children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={controlClass(invalid, `cursor-pointer appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-9 ${className}`)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B6580' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ invalid, className = '', ...rest }, ref) {
    return <textarea ref={ref} className={controlClass(invalid, `min-h-[88px] ${className}`)} {...rest} />;
  },
);

/** Debounced-search look: search icon, clear button, no "Search" submit. */
export function SearchField({
  value,
  onChange,
  placeholder = 'Search…',
  label,
  className = '',
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        id="global-search-input"
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={controlClass(false, 'pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden')}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition hover:bg-surface-2 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Button — one component for every action in the product.
 * Variants: primary (brand), secondary (white + border), ghost (transparent),
 * danger (destructive), subtle (tinted brand).
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-55 active:translate-y-px';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-500 text-white shadow-xs hover:bg-brand-600 hover:shadow-[0_10px_20px_-14px_rgb(var(--brand-500))] active:bg-brand-700',
  secondary:
    'border border-line-strong bg-surface text-ink shadow-xs hover:border-brand-400 hover:bg-surface-2 hover:text-brand-700',
  ghost: 'text-ink-soft hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-white shadow-xs hover:bg-danger/90 active:bg-danger',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-[15px]',
  icon: 'h-9 w-9',
};

export function buttonClass({
  variant = 'primary',
  size = 'md',
  className = '',
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconRight,
    className = '',
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
      {iconRight}
    </button>
  );
});

/** Square icon-only button — always pass an accessible label. */
export function IconButton({
  label,
  variant = 'ghost',
  size = 'icon',
  className = '',
  children,
  ...rest
}: Omit<ButtonProps, 'icon' | 'iconRight' | 'children'> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={buttonClass({ variant, size, className })}
      {...rest}
    >
      {children}
    </button>
  );
}

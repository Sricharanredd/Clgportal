import { useId } from 'react';

type LogoProps = { className?: string };

/**
 * Prism College mark — inline SVG so no image asset is required.
 * Decorative: pair it with visible text (the college name) for screen readers.
 * Brand colours come from the CSS variables in index.css ("BRAND TOKENS").
 */
export default function Logo({ className = 'h-8 w-8' }: LogoProps): JSX.Element {
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: 'rgb(var(--brand-400))' }} />
          <stop offset="100%" style={{ stopColor: 'rgb(var(--brand-600))' }} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      {/* Prism triangle with a refracted beam */}
      <path d="M16 6.5 L25.2 23.5 H6.8 Z" fill="rgba(255,255,255,0.94)" />
      <path
        d="M16 6.5 V23.5"
        stroke="rgb(var(--brand-600))"
        strokeOpacity="0.35"
        strokeWidth="1.1"
      />
      <path
        d="M11.4 15.4 H20.6"
        stroke="rgb(var(--brand-600))"
        strokeOpacity="0.35"
        strokeWidth="1.1"
      />
      <path
        d="M24 12.5 L29 10.5 M24.6 15.5 L29.6 15.5"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

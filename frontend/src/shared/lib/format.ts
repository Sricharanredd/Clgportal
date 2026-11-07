/** Display formatters for money, percentages, dates and optional fields. */

/** Shown instead of "—" for fields the API leaves empty. */
export const NOT_PROVIDED = 'Not provided';

/** Indian-grouped rupee formatting: "1321000.00" → "₹13,21,000". */
export function inr(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return (
    '₹' +
    new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(n)
  );
}

/** Money with paise preserved: "1321000.00" → "₹13,21,000.00". */
export function inrExact(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return (
    '₹' +
    new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
  );
}

export function pct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value}%`;
}

/** "2008-03-12" → "12 Mar 2008". */
export function dateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "2008-03-12" → "12 March 2008" (no time). */
export function dateLong(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "2026-11-03T10:42:00" → "03 Nov 2026, 10:42". */
export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "2026-11-03" → "Today" / "Yesterday" / "03 Nov 2026". */
export function dayLabel(iso: string | null | undefined): string {
  if (!iso) return 'Today';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return dateShort(iso);
}

/** "2026-11-03" → "Tuesday, 3 November 2026". */
export function todayLong(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Capitalise an API enum: "female" → "Female", "bank_transfer" → "Bank transfer". */
export function capitalize(value: string | null | undefined): string {
  if (!value) return NOT_PROVIDED;
  const text = value.replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Any optional display value, with a friendly fallback instead of "—". */
export function display(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return NOT_PROVIDED;
  const text = String(value).trim();
  if (!text || text === '—') return NOT_PROVIDED;
  return text;
}

/** Mark percentage (0–100) from marks obtained / max marks. */
export function marksPct(obtained: string | number | null | undefined, max: string | number | null | undefined): number {
  const o = Number(obtained);
  const m = Number(max);
  if (!Number.isFinite(o) || !Number.isFinite(m) || m <= 0) return 0;
  return Math.round((o / m) * 1000) / 10;
}

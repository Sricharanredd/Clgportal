/** Shared fee presentation helpers (server sends amounts as exact strings). */

export type FeeDisplayStatus = 'Paid' | 'Partial' | 'Overdue' | 'Pending';
export type FeeDisplayTone = 'success' | 'warning' | 'danger';

/**
 * The API stores an obligation's lifecycle status ("active"). Readers need a
 * payment-facing label instead, derived from the amounts and the due date.
 */
export function feeStatusInfo({
  pending,
  paid,
  dueDate,
}: {
  pending: number;
  paid: number;
  dueDate: string | null;
}): { label: FeeDisplayStatus; tone: FeeDisplayTone } {
  if (pending <= 0.005) return { label: 'Paid', tone: 'success' };
  if (paid > 0.005) return { label: 'Partial', tone: 'warning' };
  if (dueDate) {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!Number.isNaN(due.getTime()) && due.getTime() < today.getTime()) {
      return { label: 'Overdue', tone: 'danger' };
    }
  }
  return { label: 'Pending', tone: 'warning' };
}

/** Percentage paid (0–100), safe for zero/blank totals. */
export function paidPercent(total: string | number, paid: string | number): number {
  const t = Number(total);
  const p = Number(paid);
  if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(p)) return 0;
  return Math.max(0, Math.min(100, (p / t) * 100));
}

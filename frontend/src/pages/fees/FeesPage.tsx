/**
 * Fees workspace for the accounts role:
 *  - Overview KPIs (GET /fees/summary)
 *  - Record payment (POST /fees/payments) with a client-held idempotency key
 *    so a double-click can NEVER create two payments
 *  - Payment history with reversal (reason required, appended — never overwritten)
 *  - Audit trail (fees:audit:read)
 */
import { useCallback, useEffect, useState } from 'react';
import { Search, Undo2, Wallet } from 'lucide-react';
import { ApiError, get, post } from '@/shared/api/client';
import type {
  AuditPage,
  FeeSummaryOut,
  ObligationOut,
  PaymentOut,
  PaymentPage,
  StudentFeesOut,
} from '@/shared/api/types';
import { ErrorState, EmptyState, Spinner } from '@/components/ui/States';
import { KpiCard, Panel } from '@/components/ui/Panel';
import { useAuth } from '@/app/AuthContext';
import { dateTime, inrExact } from '@/shared/lib/format';

type Tab = 'overview' | 'record' | 'payments' | 'audit';

const METHODS = ['cash', 'upi', 'bank_transfer', 'cheque', 'card'] as const;

const newIdempotencyKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function FeesPage(): JSX.Element {
  const { has } = useAuth();
  const canWrite = has('payments:write');
  const canAudit = has('fees:audit:read');

  const [tab, setTab] = useState<Tab>('overview');
  const [summary, setSummary] = useState<FeeSummaryOut | null>(null);
  const [summaryError, setSummaryError] = useState<unknown>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      setSummary(await get<FeeSummaryOut>('/fees/summary'));
    } catch (err) {
      setSummaryError(err);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    ...(canWrite ? [{ id: 'record' as Tab, label: 'Record payment' }] : []),
    { id: 'payments', label: 'Payments' },
    ...(canAudit ? [{ id: 'audit' as Tab, label: 'Audit trail' }] : []),
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-plum">Fees</h2>
        <p className="text-sm text-muted">Collections, payments, reversals, and audit history</p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Fees sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === t.id ? 'nav-active' : 'bg-white/70 text-plum hover:bg-white'
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        summaryLoading ? (
          <Spinner label="Loading fee summary…" />
        ) : summaryError ? (
          <ErrorState error={summaryError} onRetry={() => void loadSummary()} />
        ) : summary ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
              <KpiCard label="Total billed" value={inrExact(summary.total_billed)} accent="violet" />
              <KpiCard label="Collected" value={inrExact(summary.total_collected)} accent="sage" />
              <KpiCard label="Outstanding" value={inrExact(summary.total_outstanding)} accent="rose" />
              <KpiCard label="Collected today" value={inrExact(summary.today_collections)} accent="periwinkle" />
              <KpiCard
                label="Fully cleared"
                value={`${summary.fully_cleared}/${summary.students_with_obligations}`}
                hint="students"
                accent="violet"
              />
            </div>
            <Panel title="How this is computed">
              <p className="text-sm text-muted">
                Figures come from the server over Decimal money columns — the browser never
                computes balances. Every payment writes a fee-audit row inside the same
                transaction as the balance change.
              </p>
            </Panel>
          </div>
        ) : null
      ) : null}

      {tab === 'record' ? <RecordPayment onRecorded={loadSummary} /> : null}
      {tab === 'payments' ? <PaymentHistory canWrite={canWrite} onChanged={loadSummary} /> : null}
      {tab === 'audit' ? <AuditTrail /> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Record payment                                                              */
/* -------------------------------------------------------------------------- */

function RecordPayment({ onRecorded }: { onRecorded: () => void }) {
  const [roll, setRoll] = useState('');
  const [student, setStudent] = useState<StudentFeesOut | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<unknown>(null);

  const [obligationId, setObligationId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('cash');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PaymentOut | null>(null);

  // Held across retries of the SAME submission so double-clicks replay, not duplicate.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setSearchError(null);
    setStudent(null);
    setReceipt(null);
    try {
      const page = await get<{ items: Array<{ id: number }> }>('/students', { roll, page_size: 1 });
      if (page.items.length === 0) {
        setSearchError(new ApiError(404, 'NOT_FOUND', `No student with roll “${roll}”.`));
        return;
      }
      const fees = await get<StudentFeesOut>(`/fees/students/${page.items[0].id}`);
      setStudent(fees);
      const firstOpen = fees.obligations.find((o) => o.can_record_payment);
      setObligationId(firstOpen?.id ?? '');
      setAmount(firstOpen ? firstOpen.pending_amount : '');
    } catch (err) {
      setSearchError(err);
    } finally {
      setSearching(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (obligationId === '') return;
    setSaving(true);
    setFormError(null);
    setReceipt(null);
    try {
      const payment = await post<PaymentOut>('/fees/payments', {
        obligation_id: obligationId,
        amount,
        method,
        reference: reference || null,
        reason: reason || null,
        idempotency_key: idempotencyKey,
      });
      setReceipt(payment);
      setIdempotencyKey(newIdempotencyKey()); // next payment = new key
      setAmount('');
      setReference('');
      setReason('');
      // refresh the student's balances
      if (student) {
        const fresh = await get<StudentFeesOut>(`/fees/students/${student.student_id}`);
        setStudent(fresh);
        const open = fresh.obligations.find((o) => o.can_record_payment);
        setObligationId(open?.id ?? '');
        setAmount(open ? open.pending_amount : '');
      }
      onRecorded();
    } catch (err) {
      setFormError(err instanceof ApiError ? `${err.message} (${err.code})` : 'Payment failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Find student">
        <form className="flex gap-2" onSubmit={search}>
          <input
            className="surface w-full rounded-xl px-3 py-2 text-sm text-plum placeholder:text-muted"
            placeholder="Roll number e.g. MPC25001"
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            aria-label="Roll number"
          />
          <button type="submit" className="btn-primary" disabled={searching}>
            <Search className="h-4 w-4" />
            {searching ? '…' : 'Find'}
          </button>
        </form>

        {searchError ? (
          <p className="mt-3 text-sm text-rose" role="alert">
            {searchError instanceof ApiError ? searchError.message : 'Search failed.'}
          </p>
        ) : null}

        {student ? (
          <div className="mt-4 space-y-3">
            <div className="surface rounded-xl p-3">
              <p className="font-medium text-plum">{student.student_name}</p>
              <p className="text-xs text-muted">
                <span className="font-mono text-violet">{student.roll_number}</span> ·{' '}
                {student.branch_code}
              </p>
            </div>
            <ul className="space-y-2">
              {student.obligations.map((o: ObligationOut) => (
                <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="text-plum">{o.fee_structure_name}</p>
                    <p className="text-xs text-muted">
                      {inrExact(o.paid_amount)} paid of {inrExact(o.total_amount)} · {o.status}
                    </p>
                  </div>
                  <span className="font-semibold text-rose">{inrExact(o.pending_amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Panel>

      <Panel title="Record payment">
        {receipt ? (
          <div className="mb-4 rounded-xl border border-sage/40 bg-sage/10 p-4 text-sm" role="status">
            <p className="font-semibold text-plum">
              Payment recorded — receipt {receipt.receipt_number}
            </p>
            <p className="text-muted">
              {inrExact(receipt.amount)} via {receipt.method} for {receipt.student_name} (
              {receipt.roll_number})
            </p>
          </div>
        ) : null}

        <form className="space-y-3" onSubmit={submit}>
          <div>
            <label htmlFor="pay-ob" className="mb-1 block text-xs font-medium text-muted">
              Obligation
            </label>
            <select
              id="pay-ob"
              className="surface w-full rounded-xl px-3 py-2 text-sm text-plum"
              value={obligationId}
              onChange={(e) => setObligationId(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="" disabled>
                {student ? 'Select an obligation' : 'Find a student first'}
              </option>
              {student?.obligations.map((o) => (
                <option key={o.id} value={o.id} disabled={!o.can_record_payment}>
                  {o.fee_structure_name} — pending {inrExact(o.pending_amount)}
                  {o.can_record_payment ? '' : ' (settled)'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pay-amount" className="mb-1 block text-xs font-medium text-muted">
                Amount (₹)
              </label>
              <input
                id="pay-amount"
                type="number"
                min="0.01"
                step="0.01"
                className="surface w-full rounded-xl px-3 py-2 text-sm text-plum"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="pay-method" className="mb-1 block text-xs font-medium text-muted">
                Method
              </label>
              <select
                id="pay-method"
                className="surface w-full rounded-xl px-3 py-2 text-sm text-plum"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pay-ref" className="mb-1 block text-xs font-medium text-muted">
                Reference (optional)
              </label>
              <input
                id="pay-ref"
                className="surface w-full rounded-xl px-3 py-2 text-sm text-plum placeholder:text-muted"
                placeholder="UPI txn / cheque no."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="pay-reason" className="mb-1 block text-xs font-medium text-muted">
                Reason (optional)
              </label>
              <input
                id="pay-reason"
                className="surface w-full rounded-xl px-3 py-2 text-sm text-plum placeholder:text-muted"
                placeholder="Installment 1"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          {formError ? (
            <p className="rounded-xl border border-rose/40 bg-rose/10 px-3 py-2 text-sm text-plum" role="alert">
              {formError}
            </p>
          ) : null}

          <button type="submit" className="btn-primary w-full" disabled={saving || obligationId === ''}>
            <Wallet className="h-4 w-4" />
            {saving ? 'Recording…' : 'Record payment'}
          </button>
          <p className="text-xs text-muted">
            Safe to retry: the idempotency key replays the original receipt instead of charging
            twice.
          </p>
        </form>
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Payment history + reversal                                                  */
/* -------------------------------------------------------------------------- */

function PaymentHistory({
  canWrite,
  onChanged,
}: {
  canWrite: boolean;
  onChanged: () => void;
}) {
  const [page, setPage] = useState(1);
  const [roll, setRoll] = useState('');
  const [data, setData] = useState<PaymentPage | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const [reversingId, setReversingId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await get<PaymentPage>('/fees/payments', { page, page_size: 10, roll: roll || undefined }));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, roll]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmReversal = async (paymentId: number) => {
    setBusy(true);
    setActionError(null);
    try {
      await post<PaymentOut>(`/fees/payments/${paymentId}/reverse`, { reason });
      setReversingId(null);
      setReason('');
      await load();
      onChanged();
    } catch (err) {
      setActionError(err instanceof ApiError ? `${err.message} (${err.code})` : 'Reversal failed.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner label="Loading payments…" />;
  if (error) return <ErrorState error={error} onRetry={() => void load()} />;
  if (!data || data.items.length === 0) {
    return (
      <div className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            void load();
          }}
        >
          <input
            className="surface w-56 rounded-xl px-3 py-2 text-sm text-plum placeholder:text-muted"
            placeholder="Filter by roll"
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            aria-label="Filter payments by roll"
          />
          <button type="submit" className="btn-ghost">
            Filter
          </button>
        </form>
        <EmptyState title="No payments found" hint="Record a payment from the previous tab." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          void load();
        }}
      >
        <input
          className="surface w-56 rounded-xl px-3 py-2 text-sm text-plum placeholder:text-muted"
          placeholder="Filter by roll"
          value={roll}
          onChange={(e) => setRoll(e.target.value)}
          aria-label="Filter payments by roll"
        />
        <button type="submit" className="btn-ghost">
          Filter
        </button>
      </form>

      {actionError ? (
        <p className="rounded-xl border border-rose/40 bg-rose/10 px-3 py-2 text-sm text-plum" role="alert">
          {actionError}
        </p>
      ) : null}

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-periwinkle/30 text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 pr-3 font-medium">Receipt</th>
                <th className="pb-2 pr-3 font-medium">Student</th>
                <th className="pb-2 pr-3 text-right font-medium">Amount</th>
                <th className="pb-2 pr-3 font-medium">Method</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Recorded</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-periwinkle/20">
              {data.items.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 pr-3 font-mono text-xs text-violet">{p.receipt_number}</td>
                  <td className="py-2 pr-3 text-plum">
                    {p.student_name}
                    <span className="ml-2 text-xs text-muted">{p.roll_number}</span>
                  </td>
                  <td className="py-2 pr-3 text-right font-semibold text-plum">
                    {inrExact(p.amount)}
                  </td>
                  <td className="py-2 pr-3 text-muted">{p.method.replace('_', ' ')}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        p.status === 'completed' ? 'bg-sage/20 text-sage' : 'bg-rose/20 text-rose'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted">{dateTime(p.paid_at)}</td>
                  <td className="py-2 text-right">
                    {canWrite && p.status === 'completed' && p.reversal_of_payment_id == null ? (
                      reversingId === p.id ? null : (
                        <button
                          type="button"
                          className="btn-ghost px-2 py-1 text-xs"
                          onClick={() => {
                            setReversingId(p.id);
                            setReason('');
                          }}
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          Reverse
                        </button>
                      )
                    ) : null}
                    {reversingId === p.id ? (
                      <div className="flex justify-end gap-2">
                        <input
                          className="surface w-44 rounded-lg px-2 py-1 text-xs text-plum"
                          placeholder="Reason (required)"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          autoFocus
                          aria-label="Reversal reason"
                        />
                        <button
                          type="button"
                          className="btn-primary px-2 py-1 text-xs"
                          disabled={busy || reason.trim().length < 5}
                          onClick={() => void confirmReversal(p.id)}
                        >
                          {busy ? '…' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          className="btn-ghost px-2 py-1 text-xs"
                          onClick={() => setReversingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.pages > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted">
              {data.total} payments · page {data.page} of {data.pages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Audit trail                                                                 */
/* -------------------------------------------------------------------------- */

function AuditTrail() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AuditPage | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await get<AuditPage>('/fees/audit', { page, page_size: 10 }));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Spinner label="Loading audit trail…" />;
  if (error) return <ErrorState error={error} onRetry={() => void load()} />;
  if (!data || data.items.length === 0) {
    return <EmptyState title="No audit entries" hint="Payments and reversals append rows here." />;
  }

  return (
    <Panel>
      <ul className="divide-y divide-periwinkle/20">
        {data.items.map((a) => (
          <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 text-sm">
            <span className="rounded-full bg-periwinkle/30 px-2 py-0.5 text-[11px] font-semibold text-violet">
              {a.operation.replace(/_/g, ' ')}
            </span>
            <span className="font-medium text-plum">{a.student_name}</span>
            <span className="text-xs text-muted">{a.roll_number}</span>
            {a.field_name ? (
              <span className="text-xs text-muted">
                {a.field_name}: {a.previous_value ?? '—'} → {a.new_value ?? '—'}
              </span>
            ) : null}
            {a.amount ? <span className="font-semibold text-plum">{inrExact(a.amount)}</span> : null}
            {a.reason ? <span className="text-xs italic text-muted">“{a.reason}”</span> : null}
            <span className="ml-auto text-xs text-muted">
              {a.actor_name ?? 'system'} · {dateTime(a.created_at)}
            </span>
          </li>
        ))}
      </ul>

      {data.pages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">
            page {data.page} of {data.pages}
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

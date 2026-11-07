/** Accounts dashboard: money KPIs, recent payments and the audit trail. */
import { Link } from 'react-router-dom';
import { CheckCircle2, IndianRupee, ReceiptText, TrendingUp, Wallet } from 'lucide-react';
import type { AccountsDashboard } from '@/shared/api/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Panel';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/States';
import { buttonClass } from '@/components/ui/Button';
import { dateTime, inr, inrExact, todayLong } from '@/shared/lib/format';
import { AttentionPanel, type AttentionItem } from './AttentionPanel';
import MonthlyChart from './MonthlyChart';

type PaymentRow = AccountsDashboard['recent_payments'][number];

export default function AccountsView({
  data,
  heading,
}: {
  data: AccountsDashboard;
  heading: string;
}): JSX.Element {
  const outstanding = Number(data.total_outstanding);
  const attention: AttentionItem[] = [];

  if (outstanding > 0) {
    attention.push({
      id: 'outstanding',
      title: `${inr(data.total_outstanding)} still outstanding`,
      description: `${data.student_count_with_obligations - data.fully_cleared} of ${data.student_count_with_obligations} students have a pending balance.`,
      actionLabel: 'Open fees',
      to: '/fees',
      tone: 'danger',
      icon: <IndianRupee className="h-4 w-4" />,
    });
  }
  if (data.today_payment_count === 0) {
    attention.push({
      id: 'today',
      title: 'No payments recorded today',
      description: 'Record a receipt when a student pays at the counter.',
      actionLabel: 'Record payment',
      to: '/fees',
      tone: 'warning',
      icon: <ReceiptText className="h-4 w-4" />,
    });
  }

  const columns: Array<Column<PaymentRow>> = [
    {
      id: 'receipt',
      header: 'Receipt',
      render: (row) => (
        <span className="font-mono text-[11.5px] font-semibold text-brand-700">{row.receipt_number}</span>
      ),
    },
    {
      id: 'student',
      header: 'Student',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">{row.student}</p>
          <p className="text-[11.5px] text-muted">{row.roll_number}</p>
        </div>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => <span className="text-[13px] font-bold text-ink">{inrExact(row.amount)}</span>,
    },
    {
      id: 'method',
      header: 'Method',
      hideBelow: 'lg',
      render: (row) => <span className="text-[12.5px] capitalize text-muted">{row.method.replace(/_/g, ' ')}</span>,
    },
    {
      id: 'when',
      header: 'Recorded',
      hideBelow: 'lg',
      render: (row) => <span className="text-[11.5px] text-muted">{dateTime(row.paid_at)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Accounts"
        title={heading}
        description="Collections, receipts and the audit trail — every rupee traceable."
        meta={
          <>
            <span>{todayLong()}</span>
            <span aria-hidden>·</span>
            <span>Updated {dateTime(data.generated_at)}</span>
          </>
        }
        actions={
          <Link to="/fees" className={buttonClass({ variant: 'primary', size: 'md' })}>
            <Wallet className="h-4 w-4" aria-hidden />
            Open fees
          </Link>
        }
      />

      <AttentionPanel
        items={attention}
        allClearTitle="Collections are up to date"
        allClearBody="No outstanding balances need chasing today."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Total collected"
          value={inrExact(data.total_collected)}
          hint="Lifetime receipts"
          icon={<IndianRupee className="h-4 w-4" />}
          tone="success"
          to="/fees"
        />
        <StatCard
          label="Outstanding"
          value={inrExact(data.total_outstanding)}
          hint="Pending across all students"
          icon={<ReceiptText className="h-4 w-4" />}
          tone={outstanding > 0 ? 'danger' : 'success'}
          to="/fees"
        />
        <StatCard
          label="Collected today"
          value={inrExact(data.today_collections)}
          hint={`${data.today_payment_count} payment${data.today_payment_count === 1 ? '' : 's'}`}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Fully cleared"
          value={data.fully_cleared}
          hint={`of ${data.student_count_with_obligations} students with obligations`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="neutral"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Monthly collections"
          description="Recorded payments per month."
          actions={<Badge tone="neutral">{data.monthly_collections.length} months</Badge>}
        >
          <MonthlyChart data={data.monthly_collections} />
        </Panel>

        <Panel title="Recent payments" description="Latest receipts recorded." bodyClassName="p-0">
          {data.recent_payments.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No payments yet"
                description="Record a payment to see the receipt here."
                icon={<ReceiptText className="h-5 w-5" aria-hidden />}
                action={
                  <Link to="/fees" className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                    Record payment
                  </Link>
                }
                compact
              />
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={data.recent_payments}
              rowKey={(row) => row.id}
              caption="Recent payments"
              className="rounded-none border-0 shadow-none"
              renderMobileCard={(row) => (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">{row.student}</p>
                    <p className="text-[11.5px] text-muted">
                      {row.roll_number} · {row.method.replace(/_/g, ' ')}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-brand-700">{row.receipt_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-ink">{inrExact(row.amount)}</p>
                    <p className="text-[11px] text-muted">{dateTime(row.paid_at)}</p>
                  </div>
                </div>
              )}
            />
          )}
        </Panel>
      </div>

      <Panel
        title="Recent audit trail"
        description="Append-only record of money movements."
        actions={<Badge tone="neutral">{data.recent_audit.length} entries</Badge>}
        bodyClassName="p-0"
      >
        {data.recent_audit.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No audit entries yet" description="Payments and reversals append rows here." compact />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {data.recent_audit.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-5 py-3 text-[13px]">
                <Badge tone={entry.operation === 'reversal' ? 'danger' : 'brand'} className="capitalize">
                  {entry.operation.replace(/_/g, ' ')}
                </Badge>
                <span className="font-semibold text-ink">{entry.student}</span>
                <span className="text-[11.5px] text-muted">{entry.roll_number}</span>
                {entry.amount ? (
                  <span className="font-bold text-ink">{inrExact(entry.amount)}</span>
                ) : null}
                {entry.reason ? (
                  <span className="text-[12px] italic text-muted">“{entry.reason}”</span>
                ) : null}
                <span className="ml-auto text-[11.5px] text-muted">{dateTime(entry.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="flex items-center gap-2 text-[11.5px] text-muted">
        <Wallet className="h-3.5 w-3.5" aria-hidden />
        Balances are Decimal values computed by the server — the browser never recalculates them.
      </p>
    </div>
  );
}

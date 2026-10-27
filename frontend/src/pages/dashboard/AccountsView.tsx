/** Accounts dashboard: money KPIs, recent payments and audit trail. */
import type { AccountsDashboard } from '@/shared/api/types';
import { KpiCard, Panel } from '@/components/ui/Panel';
import { dateTime, inrExact } from '@/shared/lib/format';
import MonthlyChart from './MonthlyChart';

export default function AccountsView({
  data,
  heading,
}: {
  data: AccountsDashboard;
  heading: string;
}): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-plum">{heading}</h2>
          <p className="text-sm text-muted">Fees &amp; collections overview</p>
        </div>
        <span className="text-xs text-muted">Generated {dateTime(data.generated_at)}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Total collected" value={inrExact(data.total_collected)} accent="sage" />
        <KpiCard label="Outstanding" value={inrExact(data.total_outstanding)} accent="rose" />
        <KpiCard
          label="Collected today"
          value={inrExact(data.today_collections)}
          hint={`${data.today_payment_count} payment${data.today_payment_count === 1 ? '' : 's'}`}
          accent="violet"
        />
        <KpiCard
          label="Fully cleared"
          value={data.fully_cleared}
          hint={`of ${data.student_count_with_obligations} students with obligations`}
          accent="periwinkle"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Monthly collections">
          <MonthlyChart data={data.monthly_collections} />
        </Panel>

        <Panel title="Recent payments">
          {data.recent_payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-periwinkle/30 text-xs uppercase tracking-wide text-muted">
                    <th className="pb-2 pr-3 font-medium">Receipt</th>
                    <th className="pb-2 pr-3 font-medium">Student</th>
                    <th className="pb-2 pr-3 text-right font-medium">Amount</th>
                    <th className="pb-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-periwinkle/20">
                  {data.recent_payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 pr-3 font-mono text-xs text-violet">{p.receipt_number}</td>
                      <td className="py-2 pr-3 text-plum">
                        {p.student}
                        <span className="ml-2 text-xs text-muted">{p.roll_number}</span>
                      </td>
                      <td className="py-2 pr-3 text-right font-semibold text-plum">
                        {inrExact(p.amount)}
                      </td>
                      <td className="py-2 text-xs text-muted">{dateTime(p.paid_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Recent audit trail">
        {data.recent_audit.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No audit entries yet.</p>
        ) : (
          <ul className="divide-y divide-periwinkle/20">
            {data.recent_audit.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 text-sm">
                <span className="rounded-full bg-periwinkle/30 px-2 py-0.5 text-[11px] font-medium text-violet">
                  {a.operation.replace(/_/g, ' ')}
                </span>
                <span className="font-medium text-plum">{a.student}</span>
                <span className="text-xs text-muted">{a.roll_number}</span>
                {a.amount ? <span className="font-semibold text-plum">{inrExact(a.amount)}</span> : null}
                {a.reason ? <span className="text-xs italic text-muted">“{a.reason}”</span> : null}
                <span className="ml-auto text-xs text-muted">{dateTime(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

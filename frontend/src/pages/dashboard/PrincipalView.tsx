/** Principal dashboard: institution KPIs, branch attendance, activity, notices. */
import type { PrincipalDashboard } from '@/shared/api/types';
import { KpiCard, Panel } from '@/components/ui/Panel';
import { inr, pct, dateTime } from '@/shared/lib/format';
import MonthlyChart from './MonthlyChart';

export default function PrincipalView({
  data,
  heading,
}: {
  data: PrincipalDashboard;
  heading: string;
}): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-plum">{heading}</h2>
          <p className="text-sm text-muted">
            {data.academic_year ? `Academic year ${data.academic_year} · ` : ''}Principal overview
          </p>
        </div>
        <span className="text-xs text-muted">Generated {dateTime(data.generated_at)}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Students" value={data.total_students} accent="violet" />
        <KpiCard label="Faculty" value={data.total_faculty} accent="periwinkle" />
        <KpiCard
          label="Attendance today"
          value={pct(data.today_attendance_pct)}
          hint={`${data.today_sessions} session${data.today_sessions === 1 ? '' : 's'}`}
          accent="sage"
        />
        <KpiCard
          label="Fee collection"
          value={inr(data.fees_collected)}
          hint={`${inr(data.fees_outstanding)} outstanding · ${data.fee_payers} payers`}
          accent="rose"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Monthly collections">
          <MonthlyChart data={data.monthly_collections} />
        </Panel>

        <Panel title="Attendance by branch">
          {data.branch_attendance.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No attendance recorded yet.</p>
          ) : (
            <ul className="space-y-4">
              {data.branch_attendance.map((b) => (
                <li key={b.branch_code}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium text-plum">
                      {b.branch_name}{' '}
                      <span className="text-xs text-muted">
                        ({b.sessions} sessions · {b.present}/{b.total_records})
                      </span>
                    </span>
                    <span className="font-semibold text-violet">{pct(b.attendance_pct)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-periwinkle/30">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet to-rose transition-all"
                      style={{ width: `${Math.min(100, b.attendance_pct)}%` }}
                      role="progressbar"
                      aria-valuenow={b.attendance_pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${b.branch_name} attendance`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Recent activity">
          {data.recent_activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-periwinkle/20">
              {data.recent_activity.map((a) => (
                <li key={a.id} className="py-3">
                  <p className="text-sm text-plum">{a.summary}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {a.action}
                    {a.actor ? ` · ${a.actor}` : ''} · {dateTime(a.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Announcements">
          {data.announcements.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No announcements.</p>
          ) : (
            <ul className="space-y-4">
              {data.announcements.map((ann) => (
                <li key={ann.id} className="surface rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-plum">{ann.title}</p>
                    <span className="rounded-full bg-periwinkle/30 px-2 py-0.5 text-[11px] font-medium text-violet">
                      {ann.audience}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{ann.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

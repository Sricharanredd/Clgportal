/** Administrator dashboard: institution counts, branch table, activity. */
import type { AdminDashboard } from '@/shared/api/types';
import { KpiCard, Panel } from '@/components/ui/Panel';
import { dateTime } from '@/shared/lib/format';

export default function AdminView({
  data,
  heading,
}: {
  data: AdminDashboard;
  heading: string;
}): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-plum">{heading}</h2>
          <p className="text-sm text-muted">
            {data.academic_year ? `Academic year ${data.academic_year} · ` : ''}Administration
          </p>
        </div>
        <span className="text-xs text-muted">Generated {dateTime(data.generated_at)}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <KpiCard label="Students" value={data.total_students} accent="violet" />
        <KpiCard label="Staff" value={`${data.active_staff}/${data.total_staff}`} accent="sage" />
        <KpiCard label="Branches" value={data.branch_count} accent="periwinkle" />
        <KpiCard label="Classes" value={data.class_count} accent="rose" />
        <KpiCard label="Academic year" value={data.academic_year ?? '—'} accent="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Branches">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-periwinkle/30 text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3 font-medium">Branch</th>
                  <th className="pb-2 pr-3 text-right font-medium">Students</th>
                  <th className="pb-2 text-right font-medium">Classes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-periwinkle/20">
                {data.branch_summaries.map((b) => (
                  <tr key={b.branch_code}>
                    <td className="py-2 pr-3">
                      <span className="font-medium text-plum">{b.branch_name}</span>
                      <span className="ml-2 text-xs text-muted">{b.branch_code}</span>
                    </td>
                    <td className="py-2 pr-3 text-right text-plum">{b.students}</td>
                    <td className="py-2 text-right text-plum">{b.classes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

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
      </div>

      <Panel title="Announcements">
        {data.announcements.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No announcements.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {data.announcements.map((ann) => (
              <li key={ann.id} className="surface rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-plum">{ann.title}</p>
                  <span className="rounded-full bg-periwinkle/30 px-2 py-0.5 text-[11px] font-medium text-violet">
                    {ann.audience}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{ann.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

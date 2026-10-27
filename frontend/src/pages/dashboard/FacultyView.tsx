/** Faculty dashboard: today's tasks, attendance progress, pending results. */
import { Link } from 'react-router-dom';
import type { FacultyDashboard } from '@/shared/api/types';
import { KpiCard, Panel } from '@/components/ui/Panel';
import { dateTime } from '@/shared/lib/format';

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'submitted' || status === 'done'
      ? 'bg-sage/20 text-sage'
      : status === 'pending' || status === 'draft'
        ? 'bg-peach/70 text-violet-600'
        : 'bg-periwinkle/30 text-violet';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function FacultyView({
  data,
  heading,
}: {
  data: FacultyDashboard;
  heading: string;
}): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-plum">{heading}</h2>
          <p className="text-sm text-muted">
            {data.assigned_classes.length > 0
              ? `Assigned: ${data.assigned_classes.join(', ')}`
              : 'No classes assigned'}
          </p>
        </div>
        <span className="text-xs text-muted">Generated {dateTime(data.generated_at)}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {data.assigned_branches.map((b) => (
          <span key={b} className="rounded-full bg-violet/10 px-3 py-1 text-xs font-medium text-violet">
            {b}
          </span>
        ))}
        {data.assigned_subjects.map((s) => (
          <span key={s} className="rounded-full bg-rose/15 px-3 py-1 text-xs font-medium text-rose">
            {s}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Classes" value={data.assigned_classes.length} accent="violet" />
        <KpiCard
          label="Attendance done today"
          value={data.attendance_completed_today}
          accent="sage"
        />
        <KpiCard
          label="Attendance pending"
          value={data.attendance_pending_today}
          accent="rose"
        />
        <KpiCard label="Results pending" value={data.pending_results.length} accent="periwinkle" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Today's sessions">
          {data.today_sessions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No sessions scheduled today.</p>
          ) : (
            <ul className="divide-y divide-periwinkle/20">
              {data.today_sessions.map((t, i) => (
                <li key={`${t.class_section_id}-${t.date ?? 'x'}-${i}`} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-plum">{t.class_label}</p>
                    <p className="text-xs text-muted">{t.subject ?? 'Class teacher duty'}</p>
                  </div>
                  <StatusPill status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Results awaiting entry">
          {data.pending_results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">All caught up 🎉</p>
          ) : (
            <ul className="divide-y divide-periwinkle/20">
              {data.pending_results.map((p) => (
                <li key={p.examination_id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      to={`/results?exam=${p.examination_id}`}
                      className="truncate text-sm font-medium text-violet hover:underline"
                    >
                      {p.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {p.class_label} · {p.subject}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs">
                    <span className="text-muted">
                      {p.entered}/{p.expected}
                    </span>
                    <StatusPill status={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Recent attendance">
          {data.recent_attendance.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-periwinkle/20">
              {data.recent_attendance.map((a) => (
                <li key={a.id} className="py-3">
                  <p className="text-sm text-plum">{a.summary}</p>
                  <p className="mt-0.5 text-xs text-muted">{dateTime(a.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Announcements">
          {data.announcements.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No announcements.</p>
          ) : (
            <ul className="space-y-3">
              {data.announcements.map((ann) => (
                <li key={ann.id} className="surface rounded-xl p-3">
                  <p className="text-sm font-semibold text-plum">{ann.title}</p>
                  <p className="mt-1 text-sm text-muted">{ann.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

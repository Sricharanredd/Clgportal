/** Principal dashboard: institution KPIs, branch attendance, activity, notices. */
import { Link } from 'react-router-dom';
import {
  CalendarCheck2,
  IndianRupee,
  Megaphone,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react';
import type { PrincipalDashboard } from '@/shared/api/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/States';
import { ProgressBar, toneForPercent } from '@/components/ui/Progress';
import { buttonClass } from '@/components/ui/Button';
import { dateTime, inr, pct, todayLong } from '@/shared/lib/format';
import { AttentionPanel, type AttentionItem } from './AttentionPanel';
import MonthlyChart from './MonthlyChart';

export default function PrincipalView({
  data,
  heading,
}: {
  data: PrincipalDashboard;
  heading: string;
}): JSX.Element {
  const outstanding = Number(data.fees_outstanding);
  const attention: AttentionItem[] = [];

  if (data.today_sessions === 0) {
    attention.push({
      id: 'attendance-empty',
      title: 'No attendance submitted today',
      description: 'No class has submitted attendance yet. Check the workbench or remind faculty.',
      actionLabel: 'Open attendance',
      to: '/attendance',
      tone: 'warning',
      icon: <CalendarCheck2 className="h-4 w-4" />,
    });
  } else if (data.today_attendance_pct < 85) {
    attention.push({
      id: 'attendance-low',
      title: `Attendance is ${pct(data.today_attendance_pct)} today`,
      description: `${data.today_sessions} session${data.today_sessions === 1 ? '' : 's'} recorded — below the 85% target.`,
      actionLabel: 'Review attendance',
      to: '/attendance',
      tone: 'warning',
      icon: <CalendarCheck2 className="h-4 w-4" />,
    });
  }

  if (outstanding > 0) {
    attention.push({
      id: 'fees',
      title: `${inr(data.fees_outstanding)} in fees outstanding`,
      description: `${data.fee_payers} student${data.fee_payers === 1 ? '' : 's'} have recorded payments so far.`,
      actionLabel: 'Review collections',
      to: '/fees',
      tone: 'danger',
      icon: <IndianRupee className="h-4 w-4" />,
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Principal overview"
        title={heading}
        description="The whole college at a glance — attendance, collections and the latest activity."
        meta={
          <>
            <span>{todayLong()}</span>
            {data.academic_year ? (
              <>
                <span aria-hidden>·</span>
                <span>Academic year {data.academic_year}</span>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <span>Updated {dateTime(data.generated_at)}</span>
          </>
        }
        actions={
          <>
            <Link to="/students" className={buttonClass({ variant: 'primary', size: 'md' })}>
              <Users className="h-4 w-4" aria-hidden />
              Student directory
            </Link>
            <Link to="/attendance" className={buttonClass({ variant: 'secondary', size: 'md' })}>
              <CalendarCheck2 className="h-4 w-4" aria-hidden />
              Attendance
            </Link>
          </>
        }
      />

      <AttentionPanel items={attention} allClearTitle="Everything is on track" allClearBody="Attendance and collections look healthy today." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Students"
          value={data.total_students}
          hint="Active enrolments"
          icon={<Users className="h-4 w-4" />}
          tone="brand"
          to="/students"
        />
        <StatCard
          label="Faculty"
          value={data.total_faculty}
          hint="Teaching staff"
          icon={<UserCog className="h-4 w-4" />}
          tone="neutral"
        />
        <StatCard
          label="Attendance today"
          value={pct(data.today_attendance_pct)}
          hint={`${data.today_sessions} session${data.today_sessions === 1 ? '' : 's'} recorded`}
          icon={<CalendarCheck2 className="h-4 w-4" />}
          tone={toneForPercent(data.today_attendance_pct) === 'success' ? 'success' : 'warning'}
          to="/attendance"
        />
        <StatCard
          label="Fee collection"
          value={inr(data.fees_collected)}
          hint={`${inr(data.fees_outstanding)} outstanding · ${data.fee_payers} payers`}
<<<<<<< HEAD
          accent="periwinkle"
=======
          icon={<IndianRupee className="h-4 w-4" />}
          tone="accent"
          to="/fees"
>>>>>>> origin/main
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Monthly collections"
          description="Fees recorded per month across the current year."
          actions={<Badge tone="neutral">{data.monthly_collections.length} months</Badge>}
        >
          <MonthlyChart data={data.monthly_collections} />
        </Panel>

        <Panel
          title="Attendance by branch"
          description="Share of present marks across submitted sessions."
          bodyClassName="p-0"
        >
          {data.branch_attendance.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No attendance recorded yet"
                description="Branch comparisons appear once sessions are submitted."
                icon={<CalendarCheck2 className="h-5 w-5" aria-hidden />}
                compact
              />
            </div>
          ) : (
<<<<<<< HEAD
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
                      className="h-full rounded-full bg-gradient-to-r from-forest to-leaf transition-all"
                      style={{ width: `${Math.min(100, b.attendance_pct)}%` }}
                      role="progressbar"
                      aria-valuenow={b.attendance_pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${b.branch_name} attendance`}
                    />
=======
            <ul className="divide-y divide-line">
              {data.branch_attendance.map((branch) => (
                <li key={branch.branch_code} className="px-5 py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-ink">{branch.branch_name}</p>
                      <p className="text-[11.5px] text-muted">
                        {branch.sessions} session{branch.sessions === 1 ? '' : 's'} · {branch.present}/
                        {branch.total_records} present
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] font-bold text-ink">{pct(branch.attendance_pct)}</span>
>>>>>>> origin/main
                  </div>
                  <ProgressBar
                    className="mt-2"
                    value={branch.attendance_pct}
                    label={`${branch.branch_name} attendance`}
                    size="sm"
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Recent activity" description="Audit trail across the college." bodyClassName="p-0">
          {data.recent_activity.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Nothing yet" description="Actions taken in the portal appear here." compact />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {data.recent_activity.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">{entry.summary}</p>
                    <p className="mt-0.5 text-[11.5px] capitalize text-muted">
                      {entry.action.replace(/_/g, ' ')}
                      {entry.actor ? ` · ${entry.actor}` : ''} · {dateTime(entry.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Announcements" description="Notices currently visible." bodyClassName="p-0">
          {data.announcements.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No announcements"
                description="Publish a notice to reach staff, students or parents."
                icon={<Megaphone className="h-5 w-5" aria-hidden />}
                action={
                  <Link to="/announcements" className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                    Open announcements
                  </Link>
                }
                compact
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {data.announcements.map((announcement) => (
                <li key={announcement.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13.5px] font-bold text-ink">{announcement.title}</p>
                    <Badge tone="brand" className="capitalize">
                      {announcement.audience}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12.5px] leading-5 text-muted">{announcement.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <p className="flex items-center gap-2 text-[11.5px] text-muted">
        <TrendingUp className="h-3.5 w-3.5" aria-hidden />
        Figures are computed server-side from submitted records only.
      </p>
    </div>
  );
}

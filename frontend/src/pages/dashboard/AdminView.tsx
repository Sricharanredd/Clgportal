/** Administrator dashboard: institution counts, branch table, activity. */
import { Link } from 'react-router-dom';
import { Building2, CalendarDays, GraduationCap, Layers, Megaphone, UserCog, Users } from 'lucide-react';
import type { AdminDashboard } from '@/shared/api/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Panel';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/States';
import { buttonClass } from '@/components/ui/Button';
import { dateTime, todayLong } from '@/shared/lib/format';
import { AttentionPanel, type AttentionItem } from './AttentionPanel';

interface BranchRow {
  branch_code: string;
  branch_name: string;
  students: number;
  classes: number;
}

export default function AdminView({
  data,
  heading,
}: {
  data: AdminDashboard;
  heading: string;
}): JSX.Element {
  const inactiveStaff = Math.max(0, data.total_staff - data.active_staff);
  const attention: AttentionItem[] = [];

  if (data.total_students === 0) {
    attention.push({
      id: 'students',
      title: 'No students enrolled yet',
      description: 'Import or enrol students so faculty can mark attendance and enter results.',
      actionLabel: 'Open directory',
      to: '/students',
      tone: 'warning',
      icon: <Users className="h-4 w-4" />,
    });
  }
  if (inactiveStaff > 0) {
    attention.push({
      id: 'staff',
      title: `${inactiveStaff} staff account${inactiveStaff === 1 ? '' : 's'} inactive`,
      description: `${data.active_staff} of ${data.total_staff} staff accounts are currently active.`,
      actionLabel: 'View announcements',
      to: '/announcements',
      tone: 'neutral',
      icon: <UserCog className="h-4 w-4" />,
    });
  }

  const columns: Array<Column<BranchRow>> = [
    {
      id: 'branch',
      header: 'Branch',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-ink">{row.branch_name}</p>
          <p className="text-[11.5px] uppercase tracking-wide text-muted">{row.branch_code}</p>
        </div>
      ),
    },
    {
      id: 'students',
      header: 'Students',
      align: 'right',
      render: (row) => <span className="text-[13px] font-semibold text-ink">{row.students}</span>,
    },
    {
      id: 'classes',
      header: 'Classes',
      align: 'right',
      render: (row) => <span className="text-[13px] text-ink-soft">{row.classes}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title={heading}
        description="People, branches and classes — the setup behind every academic record."
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
              Students
            </Link>
            <Link to="/announcements" className={buttonClass({ variant: 'secondary', size: 'md' })}>
              <Megaphone className="h-4 w-4" aria-hidden />
              Announcements
            </Link>
          </>
        }
      />

      <AttentionPanel
        items={attention}
        allClearTitle="Setup looks healthy"
        allClearBody="Branches, classes and staff accounts are all in order."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <StatCard
          label="Students"
          value={data.total_students}
          hint="Active enrolments"
          icon={<GraduationCap className="h-4 w-4" />}
          tone="brand"
          to="/students"
        />
        <StatCard
          label="Staff"
          value={`${data.active_staff}/${data.total_staff}`}
          hint="Active accounts"
          icon={<UserCog className="h-4 w-4" />}
          tone={inactiveStaff > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Branches"
          value={data.branch_count}
          hint="Streams offered"
          icon={<Building2 className="h-4 w-4" />}
          tone="neutral"
        />
        <StatCard
          label="Classes"
          value={data.class_count}
          hint="Sections in session"
          icon={<Layers className="h-4 w-4" />}
          tone="accent"
        />
        <StatCard
          label="Academic year"
          value={data.academic_year ?? 'Not set'}
          hint="Current session"
          icon={<CalendarDays className="h-4 w-4" />}
          tone="brand"
        />
      </div>

<<<<<<< HEAD
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <KpiCard label="Students" value={data.total_students} accent="violet" />
        <KpiCard label="Staff" value={`${data.active_staff}/${data.total_staff}`} accent="sage" />
        <KpiCard label="Branches" value={data.branch_count} accent="periwinkle" />
        <KpiCard label="Classes" value={data.class_count} accent="periwinkle" />
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
=======
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Branches"
          description="Students and classes per branch."
          bodyClassName="p-0"
        >
          {data.branch_summaries.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No branches configured" description="Branches appear here once created." compact />
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={data.branch_summaries}
              rowKey={(row) => row.branch_code}
              caption="Branches with student and class counts"
              className="rounded-none border-0 shadow-none"
              renderMobileCard={(row) => (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-bold text-ink">{row.branch_name}</p>
                    <p className="text-[11.5px] uppercase tracking-wide text-muted">{row.branch_code}</p>
                  </div>
                  <div className="text-right text-[12px] text-ink-soft">
                    <p>{row.students} students</p>
                    <p className="text-muted">{row.classes} classes</p>
                  </div>
                </div>
              )}
            />
          )}
>>>>>>> origin/main
        </Panel>

        <Panel title="Recent activity" description="Latest audited actions." bodyClassName="p-0">
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
      </div>

      <Panel
        title="Announcements"
        description="Notices published to the college."
        actions={<Badge tone="neutral">{data.announcements.length}</Badge>}
        bodyClassName="p-0"
      >
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
          <ul className="grid gap-3 p-4 md:grid-cols-2">
            {data.announcements.map((announcement) => (
              <li key={announcement.id} className="rounded-panel border border-line bg-surface-2/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-bold text-ink">{announcement.title}</p>
                  <Badge tone="brand" className="capitalize">
                    {announcement.audience}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-3 text-[12.5px] leading-5 text-muted">{announcement.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

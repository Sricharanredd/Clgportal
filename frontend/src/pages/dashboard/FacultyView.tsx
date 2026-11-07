/**
 * Faculty dashboard: what needs doing today, grouped so repeated duty rows
 * collapse into one line with a real action.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CalendarCheck2,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  GraduationCap,
  Megaphone,
  Users,
} from 'lucide-react';
import type { FacultyDashboard, FacultyTask } from '@/shared/api/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/States';
import { ProgressBar } from '@/components/ui/Progress';
import { buttonClass } from '@/components/ui/Button';
import { dateLong, dateTime, dayLabel, todayLong } from '@/shared/lib/format';
import { AttentionPanel, type AttentionItem } from './AttentionPanel';

interface TaskGroup {
  key: string;
  class_section_id: number;
  class_label: string;
  subject: string | null;
  status: string;
  dates: string[];
  count: number;
}

function groupTasks(tasks: FacultyTask[]): TaskGroup[] {
  const map = new Map<string, TaskGroup>();
  for (const task of tasks) {
    const key = `${task.class_section_id}|${task.subject ?? ''}|${task.status}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (task.date && !existing.dates.includes(task.date)) existing.dates.push(task.date);
    } else {
      map.set(key, {
        key,
        class_section_id: task.class_section_id,
        class_label: task.class_label,
        subject: task.subject,
        status: task.status,
        dates: task.date ? [task.date] : [],
        count: 1,
      });
    }
  }
  return [...map.values()];
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function FacultyView({
  data,
  heading,
}: {
  data: FacultyDashboard;
  heading: string;
}): JSX.Element {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => groupTasks(data.today_sessions), [data.today_sessions]);
  const pendingCount = data.pending_results.length;
  const pendingAttendance = data.attendance_pending_today;

  const attention: AttentionItem[] = [];
  if (pendingAttendance > 0) {
    attention.push({
      id: 'attendance',
      title: `${pendingAttendance} class${pendingAttendance === 1 ? '' : 'es'} still need attendance`,
      description: 'Open today’s roster, mark each student, then submit — it takes about a minute.',
      actionLabel: 'Mark attendance',
      to: '/attendance',
      tone: 'warning',
      icon: <CalendarClock className="h-4 w-4" />,
    });
  }
  if (pendingCount > 0) {
    const first = data.pending_results[0];
    attention.push({
      id: 'results',
      title: `${pendingCount} exam${pendingCount === 1 ? '' : 's'} awaiting marks`,
      description: `${first.title} · ${first.class_label} · ${first.entered}/${first.expected} entered`,
      actionLabel: 'Enter marks',
      to: `/results?exam=${first.examination_id}`,
      tone: 'brand',
      icon: <ClipboardList className="h-4 w-4" />,
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Faculty workspace"
        title={heading}
        description={
          data.assigned_classes.length > 0
            ? `You teach ${data.assigned_classes.length} class${data.assigned_classes.length === 1 ? '' : 'es'} today. Here is what needs you.`
            : 'No classes are assigned to your account yet.'
        }
        meta={
          <>
            <span>{todayLong()}</span>
            <span aria-hidden>·</span>
            <span>Updated {dateTime(data.generated_at)}</span>
          </>
        }
        actions={
          <>
            <Link to="/attendance" className={buttonClass({ variant: 'primary', size: 'md' })}>
              <CalendarCheck2 className="h-4 w-4" aria-hidden />
              Mark attendance
            </Link>
            <Link to="/results" className={buttonClass({ variant: 'secondary', size: 'md' })}>
              <ClipboardList className="h-4 w-4" aria-hidden />
              Results
            </Link>
          </>
        }
      />

      {(data.assigned_classes.length > 0 || data.assigned_subjects.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {data.assigned_classes.map((label) => (
            <Badge key={label} tone="brand">
              {label}
            </Badge>
          ))}
          {data.assigned_subjects.map((subject) => (
            <Badge key={subject} tone="neutral">
              {subject}
            </Badge>
          ))}
        </div>
      )}

<<<<<<< HEAD
      <div className="flex flex-wrap gap-2">
        {data.assigned_branches.map((b) => (
          <span key={b} className="rounded-full bg-violet/10 px-3 py-1 text-xs font-medium text-violet">
            {b}
          </span>
        ))}
        {data.assigned_subjects.map((s) => (
          <span key={s} className="rounded-full bg-mint/50 px-3 py-1 text-xs font-medium text-forest">
            {s}
          </span>
        ))}
      </div>
=======
      <AttentionPanel items={attention} />
>>>>>>> origin/main

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Classes"
          value={data.assigned_classes.length}
          hint={data.assigned_branches.join(' · ') || 'No branches assigned'}
          icon={<GraduationCap className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Attendance done"
          value={data.attendance_completed_today}
          hint="Sessions submitted today"
          icon={<CalendarCheck2 className="h-4 w-4" />}
          tone="success"
          to="/attendance"
        />
        <StatCard
          label="Attendance pending"
          value={pendingAttendance}
          hint={pendingAttendance > 0 ? 'Needs marking today' : 'All sessions marked'}
          icon={<CalendarClock className="h-4 w-4" />}
          tone={pendingAttendance > 0 ? 'warning' : 'success'}
          to="/attendance"
        />
        <StatCard
          label="Results pending"
          value={pendingCount}
          hint={pendingCount > 0 ? 'Exams awaiting marks' : 'Nothing to enter'}
          icon={<ClipboardList className="h-4 w-4" />}
          tone={pendingCount > 0 ? 'danger' : 'success'}
          to="/results"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Today's sessions"
          description="Grouped by class and subject — repeated duty rows collapse into one."
          actions={<Badge tone="neutral">{data.today_sessions.length} total</Badge>}
          bodyClassName="p-0"
        >
          {groups.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No sessions scheduled today"
                description="When a class is timetabled it will appear here with a one-tap action."
                icon={<BookOpen className="h-5 w-5" aria-hidden />}
                action={
                  <Link to="/attendance" className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                    Open attendance
                  </Link>
                }
                compact
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {groups.map((group) => {
                const isOpen = Boolean(expanded[group.key]);
                const linkDate = group.dates[0] ?? todayISO();
                const submitted = group.status === 'submitted';
                return (
                  <li key={group.key} className="px-5 py-3.5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span
                          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-panel bg-brand-50 text-brand-600"
                          aria-hidden
                        >
                          <BookOpen className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-[13.5px] font-bold text-ink">{group.class_label}</p>
                            <StatusBadge status={group.status} dot />
                            {group.count > 1 ? (
                              <Badge tone="neutral">×{group.count} sessions</Badge>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[12.5px] text-muted">
                            {group.subject ?? 'Class teacher duty'}
                            <span aria-hidden> · </span>
                            {dateLong(linkDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                        {group.count > 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((prev) => ({ ...prev, [group.key]: !prev[group.key] }))
                            }
                            aria-expanded={isOpen}
                            className="rounded-control p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                              aria-hidden
                            />
                            <span className="sr-only">
                              {isOpen ? 'Hide' : 'Show'} the {group.count} individual sessions
                            </span>
                          </button>
                        ) : null}
                        <Link
                          to={`/attendance?class_id=${group.class_section_id}&date=${linkDate}`}
                          className={buttonClass({
                            variant: submitted ? 'secondary' : 'primary',
                            size: 'sm',
                          })}
                        >
                          {submitted ? 'Review' : 'Mark attendance'}
                        </Link>
                      </div>
                    </div>
                    {isOpen ? (
                      <ul className="mt-2.5 space-y-1 rounded-panel bg-surface-2/70 p-2 text-[12px] text-muted">
                        {group.dates.length === 0 ? (
                          <li className="px-1 py-0.5">No dates recorded for these sessions.</li>
                        ) : (
                          group.dates.map((date) => (
                            <li key={date} className="flex items-center justify-between gap-2 px-1 py-0.5">
                              <span>{dayLabel(date)}</span>
                              <span className="text-[11px] uppercase tracking-wide">{group.status.replace(/_/g, ' ')}</span>
                            </li>
                          ))
                        )}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Results awaiting entry"
          description="Marks stay hidden from parents until you publish."
          actions={<Badge tone={pendingCount > 0 ? 'warning' : 'success'}>{pendingCount} pending</Badge>}
          bodyClassName="p-0"
        >
          {pendingCount === 0 ? (
            <div className="p-4">
              <EmptyState
                title="All marks are in"
                description="Every exam assigned to you has its marks entered."
                icon={<ClipboardList className="h-5 w-5" aria-hidden />}
                compact
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {data.pending_results.map((exam) => {
                const progress = exam.expected > 0 ? (exam.entered / exam.expected) * 100 : 0;
                return (
                  <li key={exam.examination_id} className="px-5 py-3.5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-[13.5px] font-bold text-ink">{exam.title}</p>
                          <StatusBadge status={exam.status} />
                        </div>
                        <p className="mt-0.5 text-[12.5px] text-muted">
                          {exam.class_label} · {exam.subject}
                        </p>
                      </div>
                      <Link
                        to={`/results?exam=${exam.examination_id}`}
                        className={buttonClass({ variant: 'secondary', size: 'sm', className: 'shrink-0' })}
                      >
                        Enter marks
                      </Link>
                    </div>
                    <div className="mt-2.5">
                      <ProgressBar
                        value={progress}
                        label={`${exam.title} marks entered`}
                        size="sm"
                        tone={progress >= 100 ? 'success' : 'brand'}
                      />
                      <p className="mt-1 text-[11.5px] text-muted">
                        {exam.entered} of {exam.expected} students entered
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Recent attendance" description="The latest sessions you submitted." bodyClassName="p-0">
          {data.recent_attendance.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Nothing recorded yet"
                description="Submitted sessions appear here with a timestamp."
                icon={<CalendarCheck2 className="h-5 w-5" aria-hidden />}
                compact
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {data.recent_attendance.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-success" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">{entry.summary}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted">{dateTime(entry.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Announcements" description="Notices shared with staff." bodyClassName="p-0">
          {data.announcements.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No announcements"
                description="College notices will appear here."
                icon={<Megaphone className="h-5 w-5" aria-hidden />}
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
                  <p className="mt-1 line-clamp-3 text-[12.5px] leading-5 text-muted">{announcement.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <p className="flex items-center gap-2 text-[11.5px] text-muted">
        <Users className="h-3.5 w-3.5" aria-hidden />
        Scope is enforced by the server — you only see classes assigned to you.
      </p>
    </div>
  );
}

/**
 * Open student record — /parent/students/:id (demo mode only).
 * Lands on Overview. Active tab lives in ?tab= so refresh and back work.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  IndianRupee,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react';
import type {
  AnnouncementPage,
  AttendanceHistoryEntry,
  AttendanceSummary,
  ResultSummary,
  StudentFeesOut,
  StudentProfile,
} from '@/shared/api/types';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Panel, KpiCard } from '@/components/ui/Panel';
import { ProgressBar, toneForPercent } from '@/components/ui/Progress';
import { Skeleton, SkeletonStatGrid } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/States';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs } from '@/components/ui/Tabs';
import {
  NOT_PROVIDED,
  capitalize,
  dateShort,
  dateTime,
  display,
  inrExact,
  pct,
} from '@/shared/lib/format';
import { feeStatusInfo } from '@/shared/lib/fees';
import { ApiError, demoGet } from './parentClient';
import ParentShell from './ParentShell';

type Tab = 'overview' | 'attendance' | 'results' | 'fees' | 'announcements';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'results', label: 'Results' },
  { id: 'fees', label: 'Fees' },
  { id: 'announcements', label: 'Announcements' },
];

const STATUS_STYLE: Record<string, string> = {
  present: 'bg-success-bg text-success',
  late: 'bg-info-bg text-info',
  absent: 'bg-danger-bg text-danger',
  excused: 'bg-warning-bg text-warning',
  on_duty: 'bg-warning-bg text-warning',
};

function isTab(value: string | null): value is Tab {
  return TABS.some((t) => t.id === value);
}

function shownDate(iso: string | null | undefined): string {
  if (!iso) return NOT_PROVIDED;
  const formatted = dateShort(iso);
  return !formatted || formatted === '—' ? NOT_PROVIDED : formatted;
}

export default function ParentStudentPage(): JSX.Element {
  const { studentId: studentIdParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const studentId = Number(studentIdParam);
  const tab: Tab = isTab(searchParams.get('tab')) ? (searchParams.get('tab') as Tab) : 'overview';

  const setTab = (next: Tab) => {
    setSearchParams(next === 'overview' ? {} : { tab: next }, { replace: false });
  };

  if (!Number.isInteger(studentId) || studentId < 1) {
    return (
      <ParentShell>
        <EmptyState
          title="Student not found"
          description="That address is not a valid student record."
          action={
            <Link to="/parent/students" className="text-sm font-semibold text-brand-700 hover:underline">
              All students
            </Link>
          }
        />
      </ParentShell>
    );
  }

  return (
    <ParentShell>
      <StudentRecord studentId={studentId} tab={tab} onTab={setTab} />
    </ParentShell>
  );
}

function StudentRecord({
  studentId,
  tab,
  onTab,
}: {
  studentId: number;
  tab: Tab;
  onTab: (tab: Tab) => void;
}) {
  const profile = useDemoResource<StudentProfile>(`/students/${studentId}`, [studentId]);

  if (profile.loading && !profile.data) return <Spinner label="Loading student…" />;
  if (profile.error) {
    return <ErrorState error={profile.error} onRetry={profile.reload} title="Could not load this student" />;
  }

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
        <Link
          to="/parent/students"
          className="rounded px-0.5 text-muted transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          All students
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-line-strong" aria-hidden />
        <span aria-current="page" className="truncate font-semibold text-ink">
          {profile.data?.full_name ?? 'Student'}
        </span>
      </nav>

      <Tabs
        tabs={TABS}
        value={tab}
        onChange={(id) => onTab(id as Tab)}
        variant="pill"
        label="Student record sections"
      />

      {tab === 'overview' ? <OverviewTab studentId={studentId} onTab={onTab} /> : null}
      {tab === 'attendance' ? <AttendanceTab studentId={studentId} /> : null}
      {tab === 'results' ? <ResultsTab studentId={studentId} /> : null}
      {tab === 'fees' ? <FeesTab studentId={studentId} /> : null}
      {tab === 'announcements' ? <AnnouncementsTab /> : null}
    </div>
  );
}

function OverviewTab({
  studentId,
  onTab,
}: {
  studentId: number;
  onTab: (tab: Tab) => void;
}) {
  const profile = useDemoResource<StudentProfile>(`/students/${studentId}`, [studentId]);
  const announcements = useDemoResource<AnnouncementPage>('/announcements', [studentId], {
    page: 1,
    page_size: 1,
  });
  const history = useDemoResource<AttendanceHistoryEntry[]>(
    `/students/${studentId}/attendance/history`,
    [studentId],
    { limit: 5 },
  );

  if (profile.loading) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <span className="sr-only">Loading overview…</span>
        <Skeleton className="h-24 w-full rounded-panel" />
        <SkeletonStatGrid count={4} />
      </div>
    );
  }
  if (profile.error) return <ErrorState error={profile.error} onRetry={profile.reload} />;
  if (!profile.data) return null;

  const data = profile.data;
  const attendancePct = data.attendance?.attendance_pct ?? 0;
  const resultCount = data.published_results?.length ?? 0;
  const latest = announcements.data?.items[0] ?? null;
  const feesStatus = data.fee
    ? feeStatusInfo({
        pending: Number(data.fee.pending_amount),
        paid: Number(data.fee.paid_amount),
        dueDate: data.fee.due_date,
      })
    : null;
  const previewResults = (data.published_results ?? []).slice(0, 4);
  const previewAttendance = history.data ?? [];

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="flex flex-col items-center gap-4 py-6 sm:flex-row sm:items-center sm:py-5">
          <Avatar name={data.full_name} size="xl" />
          <div className="min-w-0 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-xl font-extrabold tracking-tight text-ink">{data.full_name}</h1>
              <StatusBadge status={data.is_active ? 'active' : 'inactive'} dot />
            </div>
            <p className="mt-1 text-sm text-muted">
              <span className="font-mono font-semibold text-brand-700">{data.roll_number}</span>
              {' · '}
              {data.branch_name} ({data.branch_code})
              {data.class_section ? ` · ${data.class_section}` : ''}
            </p>
            <p className="mt-0.5 text-[12.5px] text-muted">
              Academic year {display(data.academic_year)}
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Attendance"
          value={pct(data.attendance?.attendance_pct)}
          hint={<ProgressBar value={attendancePct} label="Attendance" size="sm" />}
          icon={<CalendarDays className="h-4 w-4" />}
          tone={toneForPercent(attendancePct) === 'danger' ? 'danger' : toneForPercent(attendancePct) === 'warning' ? 'warning' : 'success'}
          onClick={() => onTab('attendance')}
        />
        <StatCard
          label="Published results"
          value={resultCount}
          hint={resultCount === 1 ? 'One exam published' : 'Visible to parents'}
          icon={<ClipboardList className="h-4 w-4" />}
          tone="brand"
          onClick={() => onTab('results')}
        />
        <StatCard
          label="Fees status"
          value={feesStatus ? feesStatus.label : NOT_PROVIDED}
          hint={data.fee ? `Outstanding ${inrExact(data.fee.pending_amount)}` : NOT_PROVIDED}
          icon={<IndianRupee className="h-4 w-4" />}
          tone={feesStatus ? feesStatus.tone : 'neutral'}
          onClick={() => onTab('fees')}
        />
        <StatCard
          label="Latest announcement"
          value={latest ? 'New' : 'None'}
          hint={latest ? latest.title : 'No notices yet'}
          icon={<Bell className="h-4 w-4" />}
          tone="accent"
          onClick={() => onTab('announcements')}
        />
      </div>

      <Card>
        <CardHeader title="Student details" description="Read-only. Contact the college office to correct a detail." />
        <CardBody>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Detail icon={<CalendarDays className="h-4 w-4" />} label="Date of birth" value={shownDate(data.date_of_birth)} />
            <Detail icon={<UserRound className="h-4 w-4" />} label="Gender" value={capitalize(data.gender)} />
            <Detail icon={<UserRound className="h-4 w-4" />} label="Guardian" value={display(data.guardian_name)} />
            <Detail icon={<Phone className="h-4 w-4" />} label="Phone" value={display(data.phone)} />
            <Detail
              icon={<MapPin className="h-4 w-4" />}
              label="Address"
              value={display(data.address)}
              className="sm:col-span-2"
            />
          </dl>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Attendance"
            actions={<TabLink onClick={() => onTab('attendance')}>View all</TabLink>}
          />
          <CardBody>
            {history.loading ? (
              <Spinner label="Loading attendance…" />
            ) : previewAttendance.length === 0 ? (
              <p className="text-sm text-muted">No submitted attendance records yet.</p>
            ) : (
              <ul className="space-y-2">
                {previewAttendance.map((row, i) => (
                  <li
                    key={`${row.attendance_date}-${row.subject_code ?? 'all'}-${i}`}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="text-ink">{shownDate(row.attendance_date)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        STATUS_STYLE[row.status] ?? 'bg-surface-2 text-ink'
                      }`}
                    >
                      {capitalize(row.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Results"
            actions={<TabLink onClick={() => onTab('results')}>View all</TabLink>}
          />
          <CardBody>
            {previewResults.length === 0 ? (
              <p className="text-sm text-muted">No published results yet.</p>
            ) : (
              <ul className="space-y-2">
                {previewResults.map((row, i) => (
                  <li key={`${row.exam_title}-${row.subject_code}-${i}`} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-ink">
                      {row.subject_name}{' '}
                      <span className="text-muted">({row.exam_title})</span>
                    </span>
                    <span className="shrink-0 font-semibold text-ink">
                      {row.is_absent ? 'Absent' : `${display(row.marks_obtained)} / ${row.max_marks}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
  className = '',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-panel bg-brand-50 text-brand-600">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[11.5px] font-bold uppercase tracking-wide text-muted">{label}</dt>
        <dd className="mt-0.5 text-sm text-ink">{value}</dd>
      </div>
    </div>
  );
}

function TabLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12.5px] font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      {children}
    </button>
  );
}

function AttendanceTab({ studentId }: { studentId: number }) {
  const summary = useDemoResource<AttendanceSummary>(`/students/${studentId}/attendance`, [studentId]);
  const history = useDemoResource<AttendanceHistoryEntry[]>(
    `/students/${studentId}/attendance/history`,
    [studentId],
  );

  if (summary.loading || history.loading) return <Spinner label="Loading attendance…" />;
  if (summary.error || history.error) {
    return <ErrorState error={summary.error ?? history.error} onRetry={() => { summary.reload(); history.reload(); }} />;
  }
  if (!summary.data) return null;

  const rows = history.data ?? [];

  return (
    <div className="space-y-5">
      <Panel title="Attendance (submitted sessions only)">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <KpiCard label="Overall" value={pct(summary.data.attendance_pct)} accent="violet" />
          <KpiCard label="Sessions" value={summary.data.total_sessions} accent="periwinkle" />
          <KpiCard label="Present" value={summary.data.present} accent="sage" />
          <KpiCard label="Late" value={summary.data.late} accent="periwinkle" />
          <KpiCard label="Absent" value={summary.data.absent} accent="rose" />
        </div>
        <p className="mt-3 text-xs text-muted">Overall % = (present + late) ÷ total submitted sessions.</p>
      </Panel>
      <Panel title="Attendance history by date">
        {rows.length === 0 ? (
          <p className="py-3 text-sm text-muted">No submitted attendance records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3 font-medium">Date</th>
                  <th className="pb-2 pr-3 font-medium">Subject</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r, i) => (
                  <tr key={`${r.attendance_date}-${r.subject_code ?? 'all'}-${i}`}>
                    <td className="py-2 pr-3 text-ink">{shownDate(r.attendance_date)}</td>
                    <td className="py-2 pr-3 text-muted">
                      {r.subject_code ? `${r.subject_name ?? ''} (${r.subject_code})`.trim() : NOT_PROVIDED}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          STATUS_STYLE[r.status] ?? 'bg-surface-2 text-ink'
                        }`}
                      >
                        {capitalize(r.status)}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-muted">{display(r.remarks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function ResultsTab({ studentId }: { studentId: number }) {
  const { data, error, loading } = useDemoResource<ResultSummary[]>(
    `/students/${studentId}/results`,
    [studentId],
  );

  if (loading) return <Spinner label="Loading results…" />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;
  if (data.length === 0) {
    return (
      <EmptyState
        title="No published results"
        hint="Marks appear here only after they are published by the college."
      />
    );
  }
  return (
    <Panel title="Published results">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <th className="pb-2 pr-3 font-medium">Exam</th>
              <th className="pb-2 pr-3 font-medium">Subject</th>
              <th className="pb-2 pr-3 text-right font-medium">Marks</th>
              <th className="pb-2 font-medium">Published</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.map((r, i) => (
              <tr key={`${r.exam_title}-${r.subject_code}-${i}`}>
                <td className="py-2 pr-3 text-ink">{r.exam_title}</td>
                <td className="py-2 pr-3 text-muted">
                  {r.subject_name} ({r.subject_code})
                </td>
                <td className="py-2 pr-3 text-right font-semibold text-ink">
                  {r.is_absent ? 'Absent' : `${display(r.marks_obtained)} / ${r.max_marks}`}
                </td>
                <td className="py-2 text-xs text-muted">{shownDate(r.published_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function FeesTab({ studentId }: { studentId: number }) {
  const { data, error, loading } = useDemoResource<StudentFeesOut>(
    `/students/${studentId}/fees`,
    [studentId],
  );

  if (loading) return <Spinner label="Loading fees…" />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  const obligations = data.obligations ?? [];
  const payments = data.payments ?? [];
  const total = obligations.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const paid = obligations.reduce((sum, o) => sum + Number(o.paid_amount), 0);
  const pending = obligations.reduce((sum, o) => sum + Number(o.pending_amount), 0);
  const dueDate =
    obligations.map((o) => o.due_date).filter((d): d is string => Boolean(d)).sort()[0] ?? null;
  const status =
    obligations.length === 0
      ? null
      : feeStatusInfo({ pending, paid, dueDate });

  return (
    <div className="space-y-5">
      <Panel title="Fee status">
        {obligations.length === 0 ? (
          <p className="py-3 text-sm text-muted">No fee information available.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label="Total" value={inrExact(total)} accent="periwinkle" />
            <KpiCard label="Paid" value={inrExact(paid)} accent="sage" />
            <KpiCard label="Outstanding" value={inrExact(pending)} accent="rose" />
            <KpiCard label="Status" value={status?.label ?? '—'} accent="violet" />
          </div>
        )}
      </Panel>
      <Panel title="Fee breakdown">
        {obligations.length === 0 ? (
          <p className="py-3 text-sm text-muted">No fee obligations found for this student.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3 font-medium">Head</th>
                  <th className="pb-2 pr-3 text-right font-medium">Total</th>
                  <th className="pb-2 pr-3 text-right font-medium">Paid</th>
                  <th className="pb-2 pr-3 text-right font-medium">Pending</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {obligations.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2 pr-3 text-ink">{o.fee_structure_name}</td>
                    <td className="py-2 pr-3 text-right text-ink">{inrExact(o.total_amount)}</td>
                    <td className="py-2 pr-3 text-right text-ink">{inrExact(o.paid_amount)}</td>
                    <td className="py-2 pr-3 text-right text-ink">{inrExact(o.pending_amount)}</td>
                    <td className="py-2 text-xs text-muted">{capitalize(o.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Panel title="Payment history">
        {payments.length === 0 ? (
          <p className="py-3 text-sm text-muted">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3 font-medium">Receipt</th>
                  <th className="pb-2 pr-3 font-medium">Date</th>
                  <th className="pb-2 pr-3 font-medium">Method</th>
                  <th className="pb-2 pr-3 text-right font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-3 font-mono text-xs text-brand-700">{p.receipt_number}</td>
                    <td className="py-2 pr-3 text-ink">{dateTime(p.paid_at)}</td>
                    <td className="py-2 pr-3 text-muted">{capitalize(p.method)}</td>
                    <td className="py-2 pr-3 text-right font-semibold text-ink">{inrExact(p.amount)}</td>
                    <td className="py-2 text-xs text-muted">{capitalize(p.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-muted">
          Payments are made at the college accounts office; this portal is read-only.
        </p>
      </Panel>
    </div>
  );
}

function AnnouncementsTab() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useDemoResource<AnnouncementPage>(
    '/announcements',
    [page],
    { page, page_size: 6 },
  );

  if (loading) return <Spinner label="Loading announcements…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data || data.items.length === 0) {
    return <EmptyState title="No announcements" hint="Notices from the college appear here." />;
  }

  return (
    <div className="space-y-4">
      <ul className="grid gap-4 md:grid-cols-2">
        {data.items.map((a) => (
          <li key={a.id} className="card p-4">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">{a.title}</p>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                {a.audience}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-muted">{a.body}</p>
            <p className="mt-2 text-xs text-muted">{dateTime(a.published_at)}</p>
          </li>
        ))}
      </ul>
      {data.pages > 1 ? (
        <div className="flex items-center justify-between text-sm">
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
    </div>
  );
}

function useDemoResource<T>(
  path: string,
  deps: unknown[],
  params?: Record<string, string | number | boolean | undefined>,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await demoGet<T>(path, params));
    } catch (err) {
      setError(err instanceof ApiError ? err : err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, JSON.stringify(params), ...deps]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, loading, reload: load };
}

/**
 * Student profile — the single record for one student.
 *
 * Presentation only: one GET /students/{id} call returns the identity plus the
 * server-gated blocks (attendance / published results / fees). A missing block
 * means "no permission, or nothing published yet" — exactly as the API decides
 * — so the page explains that instead of showing zeros.
 *
 * Tabs are URL-synced (?tab=overview|attendance|results|fees) so a link can
 * open the section it refers to and refresh keeps you in place.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  IdCard,
  Info,
  Mail,
  MapPin,
  Phone,
  Receipt,
  ShieldAlert,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { get } from '@/shared/api/client';
import { useAuth } from '@/app/AuthContext';
import type { ResultSummary, StudentFeesOut, StudentProfile } from '@/shared/api/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { ProgressBar, ProgressRing, toneForPercent } from '@/components/ui/Progress';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import {
  NOT_PROVIDED,
  capitalize,
  dateLong,
  dateShort,
  display,
  inrExact,
  marksPct,
  pct,
} from '@/shared/lib/format';
import { feeStatusInfo } from '@/shared/lib/fees';

const TAB_IDS = ['overview', 'attendance', 'results', 'fees'] as const;
type TabId = (typeof TAB_IDS)[number];

function isTab(value: string | null): value is TabId {
  return TAB_IDS.includes(value as TabId);
}

/** Label/value row used in the details list. */
function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {icon ? (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-panel bg-surface-2 text-muted">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">{label}</dt>
        <dd className="mt-0.5 break-words text-[13.5px] font-medium text-ink">{value}</dd>
      </div>
    </div>
  );
}

/** Header stat: label, value, optional hint. */
function QuickStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="px-4 py-3.5 sm:px-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-muted">{label}</p>
      <p className="mt-1 text-[18px] font-extrabold leading-none tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-1.5 text-[11.5px] leading-4 text-muted">{hint}</p> : null}
    </div>
  );
}

function FeeTabSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3" role="status" aria-live="polite">
      <span className="sr-only">Loading fee details…</span>
      <div className="card space-y-4 p-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-2 w-full" />
        <SkeletonText lines={3} />
      </div>
      <div className="card space-y-3 p-5 lg:col-span-2">
        <Skeleton className="h-4 w-36" />
        <SkeletonText lines={6} />
      </div>
    </div>
  );
}


function ProfileSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Loading student profile…</span>
      <Skeleton className="h-4 w-32" />
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <Skeleton className="h-[72px] w-[72px] rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-4">
          <SkeletonText lines={2} />
          <SkeletonText lines={2} />
          <SkeletonText lines={2} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-1">
          <Skeleton className="h-4 w-28" />
          <SkeletonText lines={6} className="mt-4" />
        </div>
        <div className="card p-5 lg:col-span-2">
          <Skeleton className="h-4 w-40" />
          <SkeletonText lines={6} className="mt-4" />
        </div>
      </div>
    </div>
  );
}

/** Subject-wise result bars, grouped by exam. */
function ResultsList({ results }: { results: ResultSummary[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, ResultSummary[]>();
    for (const result of results) {
      const list = map.get(result.exam_title);
      if (list) list.push(result);
      else map.set(result.exam_title, [result]);
    }
    return [...map.entries()];
  }, [results]);

  return (
    <div className="space-y-5">
      {grouped.map(([examTitle, rows]) => (
        <section key={examTitle} aria-label={examTitle}>
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
              <ClipboardList className="h-4 w-4 text-brand-600" aria-hidden />
              {examTitle}
            </h3>
            <Badge tone="neutral">
              {rows.length} subject{rows.length === 1 ? '' : 's'}
            </Badge>
          </div>
          <ul className="divide-y divide-line rounded-panel border border-line bg-surface-2/40">
            {rows.map((result, index) => {
              const value = result.is_absent ? 0 : marksPct(result.marks_obtained, result.max_marks);
              const tone = result.is_absent ? 'neutral' : toneForPercent(value);
              return (
                <li key={`${result.subject_code}-${index}`} className="px-3.5 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-ink">
                        {result.subject_name}
                      </p>
                      <p className="text-[11px] uppercase tracking-wide text-muted">
                        {result.subject_code}
                        {result.published_at ? ` · published ${dateShort(result.published_at)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.is_absent ? (
                        <Badge tone="danger">Absent</Badge>
                      ) : (
                        <span className="text-[13px] font-bold text-ink">
                          {result.marks_obtained ?? '—'}
                          <span className="font-medium text-muted"> / {result.max_marks}</span>
                        </span>
                      )}
                      <StatusBadge status={result.status} />
                    </div>
                  </div>
                  <ProgressBar
                    className="mt-2"
                    value={value}
                    tone={tone === 'neutral' ? 'brand' : tone}
                    label={`${result.subject_name} score`}
                    size="sm"
                    showValue={!result.is_absent}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function StudentDetailPage(): JSX.Element {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<StudentProfile | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [feeDetail, setFeeDetail] = useState<StudentFeesOut | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState<unknown>(null);
  const { hasAny } = useAuth();
  const canViewFees = hasAny('fees:read', 'fees:read_scoped', 'fees:read_own');
  const canOpenFeesWorkspace = hasAny('fees:read');

  const tabParam = params.get('tab');
  const tab: TabId = isTab(tabParam) ? tabParam : 'overview';

  const setTab = useCallback(
    (next: string) => {
      const updated = new URLSearchParams(params);
      if (next === 'overview') updated.delete('tab');
      else updated.set('tab', next);
      setParams(updated, { replace: true });
    },
    [params, setParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await get<StudentProfile>(`/students/${id}`);
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadFee = useCallback(async () => {
    setFeeLoading(true);
    setFeeError(null);
    try {
      const result = await get<StudentFeesOut>(`/fees/students/${id}`);
      setFeeDetail(result);
    } catch (err) {
      setFeeError(err);
    } finally {
      setFeeLoading(false);
    }
  }, [id]);

  // The profile carries only the latest obligation summary. The Fees tab
  // fetches the full ledger (all obligations + payment history) once, on
  // first open, and reuses it while the user stays on the record.
  useEffect(() => {
    if (tab !== 'fees' || !data?.fee) return;
    if (feeDetail?.student_id === data.id) return;
    void loadFee();
  }, [tab, data?.fee, data?.id, feeDetail?.student_id, loadFee]);

  if (loading) return <ProfileSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => void load()} title="Could not load this student" />;
  if (!data) {
    return (
      <ErrorState
        error={new Error('This student record could not be found.')}
        onRetry={() => void load()}
        title="Student not found"
      />
    );
  }

  const attendance = data.attendance;
  const results = data.published_results;
  const fee = data.fee;

  // The profile carries the latest obligation only. Once the Fees tab opens,
  // the full ledger (all obligations + payment history) replaces it.
  const obligations = feeDetail?.obligations ?? [];
  const totals =
    obligations.length > 0
      ? obligations.reduce(
          (acc, item) => ({
            total: acc.total + Number(item.total_amount),
            paid: acc.paid + Number(item.paid_amount),
            pending: acc.pending + Number(item.pending_amount),
          }),
          { total: 0, paid: 0, pending: 0 },
        )
      : fee
        ? {
            total: Number(fee.total_amount),
            paid: Number(fee.paid_amount),
            pending: Number(fee.pending_amount),
          }
        : null;
  const feeDueDate =
    obligations
      .map((item) => item.due_date)
      .filter((value): value is string => Boolean(value))
      .sort()[0] ??
    fee?.due_date ??
    null;
  const feeStatus = totals
    ? feeStatusInfo({ pending: totals.pending, paid: totals.paid, dueDate: feeDueDate })
    : null;
  const paidPct = totals && totals.total > 0 ? (totals.paid / totals.total) * 100 : 0;
  const payments = feeDetail?.payments ?? [];

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview' },
    {
      id: 'attendance',
      label: 'Attendance',
      count: attendance ? attendance.total_sessions : undefined,
    },
    { id: 'results', label: 'Results', count: results.length },
    { id: 'fees', label: 'Fees' },
  ];

  return (
    <div className="space-y-5">
      <Link
        to="/students"
        className="inline-flex items-center gap-1.5 rounded-control text-[13px] font-semibold text-ink-soft transition-colors hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to students
      </Link>

<<<<<<< HEAD
      {/* Identity header */}
      <div className="glass-card flex flex-wrap items-center gap-4 rounded-2xl p-5">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-forest to-leaf text-xl font-bold text-white">
          {data.full_name.charAt(0)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-plum">{data.full_name}</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                data.is_active ? 'bg-sage/20 text-sage' : 'bg-peach/70 text-violet-600'
              }`}
            >
              {data.is_active ? 'active' : 'inactive'}
            </span>
            {data.enrollment_status ? (
              <span className="rounded-full bg-periwinkle/30 px-2 py-0.5 text-[11px] font-semibold text-violet">
                {data.enrollment_status}
              </span>
            ) : null}
=======
      {/* ── Identity header ─────────────────────────────────────────── */}
      <section className="card overflow-hidden">
        <div className="relative border-b border-line bg-gradient-to-br from-brand-50 via-surface to-accent-50 px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar name={data.full_name} size="xl" className="ring-4 ring-surface" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[24px] font-extrabold leading-tight tracking-tight text-ink sm:text-[27px]">
                  {data.full_name}
                </h1>
                <StatusBadge status={data.is_active ? 'active' : 'inactive'} dot />
                {data.enrollment_status ? (
                  <Badge tone="neutral" className="capitalize">
                    {data.enrollment_status.replace(/_/g, ' ')}
                  </Badge>
                ) : null}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted">
                <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-brand-700">
                  <IdCard className="h-3.5 w-3.5" aria-hidden />
                  {data.roll_number}
                </span>
                <span aria-hidden>·</span>
                <span>{data.branch_name}</span>
                <span aria-hidden>·</span>
                <span>{display(data.class_section)}</span>
                <span aria-hidden>·</span>
                <span>{display(data.academic_year)}</span>
              </div>
            </div>
>>>>>>> origin/main
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <QuickStat
            label="Attendance"
            value={attendance ? pct(Math.round(attendance.attendance_pct)) : 'Not available'}
            hint={
              attendance
                ? `${attendance.total_sessions} submitted session${attendance.total_sessions === 1 ? '' : 's'}`
                : 'Your role cannot view attendance'
            }
          />
          <QuickStat
            label="Published results"
            value={results.length}
            hint={results.length > 0 ? 'Visible to parents' : 'Nothing published yet'}
          />
          <QuickStat
            label="Fees pending"
            value={
              totals
                ? inrExact(totals.pending)
                : canViewFees
                  ? 'No fee records'
                  : 'Not available'
            }
            hint={
              totals && feeStatus
                ? `${feeStatus.label} · due ${dateShort(feeDueDate)}`
                : canViewFees
                  ? 'No fee records yet'
                  : 'Your role cannot view fees'
            }
          />
        </div>
      </section>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div>
        <Tabs tabs={tabs} value={tab} onChange={setTab} label="Student sections" />
      </div>

      {/* ── Overview ────────────────────────────────────────────────── */}
      {tab === 'overview' ? (
        <div role="tabpanel" aria-label="Overview" className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader
              title="Personal details"
              description="Contact and enrolment information."
              icon={<UserRound className="h-4 w-4" />}
            />
            <CardBody className="py-1">
              <dl className="divide-y divide-line">
                <DetailRow
                  label="Date of birth"
                  value={dateLong(data.date_of_birth)}
                  icon={<CalendarDays className="h-4 w-4" aria-hidden />}
                />
                <DetailRow
                  label="Gender"
                  value={capitalize(data.gender)}
                  icon={<UserRound className="h-4 w-4" aria-hidden />}
                />
                <DetailRow
                  label="Admission date"
                  value={dateLong(data.admission_date)}
                  icon={<GraduationCap className="h-4 w-4" aria-hidden />}
                />
                <DetailRow
                  label="Guardian"
                  value={display(data.guardian_name)}
                  icon={<Users className="h-4 w-4" aria-hidden />}
                />
                <DetailRow
                  label="Phone"
                  value={
                    data.phone ? (
                      <a href={`tel:${data.phone}`} className="text-brand-700 hover:underline">
                        {data.phone}
                      </a>
                    ) : (
                      NOT_PROVIDED
                    )
                  }
                  icon={<Phone className="h-4 w-4" aria-hidden />}
                />
                <DetailRow
                  label="Email"
                  value={
                    data.email ? (
                      <a href={`mailto:${data.email}`} className="break-all text-brand-700 hover:underline">
                        {data.email}
                      </a>
                    ) : (
                      NOT_PROVIDED
                    )
                  }
                  icon={<Mail className="h-4 w-4" aria-hidden />}
                />
                <DetailRow
                  label="Address"
                  value={display(data.address)}
                  icon={<MapPin className="h-4 w-4" aria-hidden />}
                />
              </dl>
            </CardBody>
          </Card>

          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader
                title="Attendance at a glance"
                description="Counted from submitted sessions only."
                icon={<CalendarCheck2 className="h-4 w-4" />}
                actions={
                  <Button variant="ghost" size="sm" onClick={() => setTab('attendance')}>
                    Details
                  </Button>
                }
              />
              <CardBody>
                {attendance ? (
                  <div className="flex flex-col items-center gap-5 sm:flex-row">
                    <ProgressRing value={attendance.attendance_pct} label="Attendance" size={116} stroke={9} />
                    <div className="grid flex-1 grid-cols-3 gap-2 text-center sm:text-left">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Present</p>
                        <p className="text-lg font-extrabold text-ink">{attendance.present}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Late</p>
                        <p className="text-lg font-extrabold text-ink">{attendance.late}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Absent</p>
                        <p className="text-lg font-extrabold text-ink">{attendance.absent}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="Attendance isn’t available"
                    description="Your role can’t read attendance for this student, or no sessions have been submitted yet."
                    icon={<ShieldAlert className="h-5 w-5" aria-hidden />}
                    compact
                  />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Latest published results"
                description="Only marks published by the principal are shown."
                icon={<ClipboardList className="h-4 w-4" />}
                actions={
                  results.length > 0 ? (
                    <Button variant="ghost" size="sm" onClick={() => setTab('results')}>
                      All results
                    </Button>
                  ) : null
                }
              />
              <CardBody>
                {results.length === 0 ? (
                  <EmptyState
                    title="No published results yet"
                    description="Marks appear here once an exam is published — drafts are never shown to parents."
                    icon={<ClipboardList className="h-5 w-5" aria-hidden />}
                    compact
                  />
                ) : (
                  <ResultsList results={results.slice(0, 3)} />
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      ) : null}

      {/* ── Attendance ──────────────────────────────────────────────── */}
      {tab === 'attendance' ? (
        <div role="tabpanel" aria-label="Attendance">
          {attendance ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader
                  title="Overall attendance"
                  description="Across every submitted session."
                  icon={<CalendarCheck2 className="h-4 w-4" />}
                />
                <CardBody className="flex flex-col items-center gap-4 py-6">
                  <ProgressRing value={attendance.attendance_pct} label="Attendance" size={148} stroke={11} />
                  <p className="text-center text-[12.5px] leading-6 text-muted">
                    {attendance.total_sessions === 0
                      ? 'No sessions have been submitted for this student yet.'
                      : `Present ${attendance.present}, late ${attendance.late}, absent ${attendance.absent}.`}
                  </p>
                </CardBody>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader
                  title="How this percentage is calculated"
                  description="The same rule is applied for every student."
                  icon={<Info className="h-4 w-4" />}
                />
                <CardBody className="space-y-4">
                  <p className="text-[13.5px] leading-6 text-ink-soft">
                    {attendance.total_sessions === 0 ? (
                      'Once a faculty member submits attendance for this class, the totals will appear here.'
                    ) : (
                      <>
                        A student is counted as <strong className="font-bold text-ink">present</strong> when
                        marked present <em>or</em> late. That makes the figure{' '}
                        <strong className="font-bold text-ink">
                          {attendance.present + attendance.late} of {attendance.total_sessions}
                        </strong>{' '}
                        sessions, or <strong className="font-bold text-ink">{pct(Math.round(attendance.attendance_pct))}</strong>.
                        Draft sessions are excluded until they are submitted.
                      </>
                    )}
                  </p>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-panel border border-line bg-surface-2/60 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Sessions</p>
                      <p className="mt-1 text-xl font-extrabold text-ink">{attendance.total_sessions}</p>
                    </div>
                    <div className="rounded-panel border border-line bg-success-bg/60 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-success">Present</p>
                      <p className="mt-1 text-xl font-extrabold text-ink">{attendance.present}</p>
                    </div>
                    <div className="rounded-panel border border-line bg-warning-bg/60 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-warning">Late</p>
                      <p className="mt-1 text-xl font-extrabold text-ink">{attendance.late}</p>
                    </div>
                    <div className="rounded-panel border border-line bg-danger-bg/60 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-danger">Absent</p>
                      <p className="mt-1 text-xl font-extrabold text-ink">{attendance.absent}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ProgressBar
                      value={attendance.attendance_pct}
                      label="Present plus late share"
                      showValue
                    />
                    <p className="text-[11.5px] text-muted">
                      Present + late ÷ submitted sessions × 100.
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>
          ) : (
            <EmptyState
              title="Attendance isn’t available for your role"
              description="Attendance is permission-gated. Ask an administrator if you need access to this block."
              icon={<ShieldAlert className="h-5 w-5" aria-hidden />}
            />
          )}
        </div>
      ) : null}

      {/* ── Results ─────────────────────────────────────────────────── */}
      {tab === 'results' ? (
        <div role="tabpanel" aria-label="Results">
          <Card>
            <CardHeader
              title="Published results"
              description="Subject-wise marks with the score bar for each exam."
              icon={<ClipboardList className="h-4 w-4" />}
              actions={
                results.length > 0 ? <Badge tone="brand">{results.length} entries</Badge> : null
              }
            />
            <CardBody>
              {results.length === 0 ? (
                <EmptyState
                  title="No published results yet"
                  description="Unpublished marks are never shown. Results appear here the moment the principal publishes an exam."
                  icon={<ClipboardList className="h-5 w-5" aria-hidden />}
                />
              ) : (
                <ResultsList results={results} />
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}

      {/* ── Fees ────────────────────────────────────────────────────── */}
      {tab === 'fees' ? (
        <div role="tabpanel" aria-label="Fees">
          {!canViewFees ? (
            <EmptyState
              title="Fee details aren’t available for your role"
              description="Fee records are permission-gated. Ask the accounts desk if you need this information."
              icon={<ShieldAlert className="h-5 w-5" aria-hidden />}
            />
          ) : !fee ? (
            <EmptyState
              title="No fee records yet"
              description="This student has no fee obligation on file. The accounts desk creates it when a fee structure is assigned."
              icon={<Wallet className="h-5 w-5" aria-hidden />}
            />
          ) : feeError ? (
            <ErrorState
              error={feeError}
              onRetry={() => void loadFee()}
              title="Could not load fee details"
            />
          ) : feeLoading && !feeDetail ? (
            <FeeTabSkeleton />
          ) : totals && feeStatus ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader
                  title="Fee summary"
                  description="Amounts are calculated by the server."
                  icon={<Wallet className="h-4 w-4" />}
                  actions={
                    <Badge tone={feeStatus.tone} dot>
                      {feeStatus.label}
                    </Badge>
                  }
                />
                <CardBody className="space-y-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                      Pending
                    </p>
                    <p className="mt-1 text-[26px] font-extrabold leading-none tracking-tight text-ink">
                      {inrExact(totals.pending)}
                    </p>
                  </div>
                  <div>
                    <ProgressBar
                      value={paidPct}
                      label="Fees paid"
                      tone={paidPct >= 100 ? 'success' : 'brand'}
                      showValue
                    />
                    <p className="mt-1.5 text-[11.5px] text-muted">
                      {inrExact(totals.paid)} of {inrExact(totals.total)} paid
                    </p>
                  </div>
                  <dl className="divide-y divide-line">
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <dt className="text-[12.5px] text-ink-soft">Total fee</dt>
                      <dd className="text-[13.5px] font-bold text-ink">
                        {inrExact(totals.total)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <dt className="text-[12.5px] text-ink-soft">Paid</dt>
                      <dd className="text-[13.5px] font-bold text-success">
                        {inrExact(totals.paid)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <dt className="text-[12.5px] text-ink-soft">Pending</dt>
                      <dd className="text-[13.5px] font-bold text-ink">
                        {inrExact(totals.pending)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <dt className="text-[12.5px] text-ink-soft">Due date</dt>
                      <dd className="text-[13.5px] font-medium text-ink">
                        {dateLong(feeDueDate)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <dt className="text-[12.5px] text-ink-soft">Status</dt>
                      <dd>
                        <Badge tone={feeStatus.tone} dot>
                          {feeStatus.label}
                        </Badge>
                      </dd>
                    </div>
                  </dl>
                  <p className="flex items-start gap-2 rounded-panel border border-line bg-surface-2/60 px-3 py-2.5 text-[12px] leading-5 text-muted">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    {canOpenFeesWorkspace
                      ? 'Payments are recorded by the accounts desk. Contact them if a receipt is missing.'
                      : 'Fee details are read-only for faculty. Payments are recorded by the accounts desk.'}
                  </p>
                  {canOpenFeesWorkspace && totals.pending > 0 ? (
                    <Link
                      to="/fees"
                      className={buttonClass({
                        variant: 'secondary',
                        size: 'sm',
                        className: 'w-full',
                      })}
                    >
                      <BookOpen className="h-3.5 w-3.5" aria-hidden />
                      Open fees workspace
                    </Link>
                  ) : null}
                </CardBody>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader
                  title="Payment history"
                  description="Receipts are never edited — corrections appear as reversals."
                  icon={<Receipt className="h-4 w-4" />}
                  actions={
                    payments.length > 0 ? (
                      <Badge tone="neutral">
                        {payments.length} entr{payments.length === 1 ? 'y' : 'ies'}
                      </Badge>
                    ) : null
                  }
                />
                <CardBody>
                  {payments.length === 0 ? (
                    <EmptyState
                      title="No payments recorded yet"
                      description="Every receipt for this student will appear here with its date, method and status."
                      icon={<Receipt className="h-5 w-5" aria-hidden />}
                      compact
                    />
                  ) : (
                    <div className="-mx-1 overflow-x-auto">
                      <table className="w-full min-w-[520px] text-left">
                        <caption className="sr-only">
                          Payment history for {data.full_name}
                        </caption>
                        <thead>
                          <tr className="border-b border-line text-[11px] font-bold uppercase tracking-wide text-muted">
                            <th scope="col" className="px-1 py-2">
                              Date
                            </th>
                            <th scope="col" className="px-1 py-2">
                              Receipt
                            </th>
                            <th scope="col" className="px-1 py-2 text-right">
                              Amount
                            </th>
                            <th scope="col" className="px-1 py-2">
                              Method
                            </th>
                            <th scope="col" className="px-1 py-2">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {payments.map((payment) => (
                            <tr key={payment.id} className="align-middle">
                              <td className="whitespace-nowrap px-1 py-2.5 text-[12.5px] text-muted">
                                {dateShort(payment.paid_at)}
                              </td>
                              <td className="whitespace-nowrap px-1 py-2.5 font-mono text-[11.5px] text-ink-soft">
                                {payment.receipt_number}
                              </td>
                              <td
                                className={`whitespace-nowrap px-1 py-2.5 text-right text-[12.5px] font-bold ${
                                  Number(payment.amount) < 0 ? 'text-danger' : 'text-ink'
                                }`}
                              >
                                {inrExact(payment.amount)}
                              </td>
                              <td className="whitespace-nowrap px-1 py-2.5 text-[12.5px] capitalize text-ink-soft">
                                {payment.method.replace(/_/g, ' ')}
                              </td>
                              <td className="px-1 py-2.5">
                                <StatusBadge status={payment.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {feeLoading ? (
                    <p
                      className="mt-3 flex items-center gap-2 text-[11.5px] text-muted"
                      role="status"
                    >
                      <span
                        className="h-3 w-3 animate-spin rounded-full border-2 border-brand-100 border-t-brand-500"
                        aria-hidden
                      />
                      Refreshing ledger…
                    </p>
                  ) : null}
                </CardBody>
              </Card>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

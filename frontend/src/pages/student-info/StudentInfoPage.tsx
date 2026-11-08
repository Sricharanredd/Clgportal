/**
 * Student Info — public, read-only lookup page for parents/students.
 *
 * URL-driven so refresh and bookmarks work:
 *   /student-info                        → branch + roll number search
 *   /student-info?student=<id>&tab=<tab> → read-only record for one student
 *
 * Data comes from the flag-gated demo API (`/parent/demo/*`) and the public
 * branch list. There is no local sample dataset: every figure is read from
 * the database. When the demo flag is off the page explains that the public
 * lookup is unavailable instead of exposing production records.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CalendarCheck2,
  ClipboardList,
  Info,
  Search,
  ShieldAlert,
  UserRound,
  Wallet,
} from 'lucide-react';
import type {
  AttendanceHistoryEntry,
  AttendanceSummary,
  BranchOut,
  ParentDirectoryItem,
  ResultSummary,
  StudentFeesOut,
  StudentProfile,
} from '@/shared/api/types';
import { get } from '@/shared/api/client';
import { DEMO_OPEN_PARENT } from '@/config/demo';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState, ErrorState, Spinner, StatePanel } from '@/components/ui/States';
import { KpiCard, Panel } from '@/components/ui/Panel';
import { dateShort, dateTime, inrExact, pct } from '@/shared/lib/format';
import { ApiError, demoGet } from '@/pages/parent/parentClient';
import CollegeOverview from '@/pages/dashboard/CollegeOverview';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'results', label: 'Results' },
  { id: 'fees', label: 'Fees' },
] as const;

type Tab = (typeof TABS)[number]['id'];

interface BranchOption {
  id: number;
  code: string;
  name: string;
}

function isTab(value: string | null): value is Tab {
  return TABS.some((tab) => tab.id === value);
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-b border-line py-2.5 last:border-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value ?? '—'}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

function SearchCard({
  branches,
  branch,
  roll,
  searching,
  feedback,
  onBranchChange,
  onRollChange,
  onSubmit,
}: {
  branches: BranchOption[];
  branch: string;
  roll: string;
  searching: boolean;
  feedback: { tone: 'error' | 'info'; message: string } | null;
  onBranchChange: (value: string) => void;
  onRollChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Panel>
      <form
        className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        onSubmit={onSubmit}
      >
        <div>
          <label htmlFor="si-branch" className="mb-1 block text-xs font-medium text-muted">
            Branch <span className="text-danger">*</span>
          </label>
          <select
            id="si-branch"
            className="surface w-full rounded-control px-3 py-2 text-sm text-ink"
            value={branch}
            required
            onChange={(event) => onBranchChange(event.target.value)}
          >
            <option value="">Select branch</option>
            {branches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} — {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="si-roll" className="mb-1 block text-xs font-medium text-muted">
            Roll Number <span className="text-danger">*</span>
          </label>
          <input
            id="si-roll"
            className="surface w-full rounded-control px-3 py-2 font-mono text-sm text-ink placeholder:font-sans placeholder:text-muted"
            placeholder="e.g. MPC25001"
            value={roll}
            required
            autoComplete="off"
            onChange={(event) => onRollChange(event.target.value)}
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className={buttonClass({ className: 'w-full sm:w-auto' })}
            disabled={searching}
            aria-busy={searching}
          >
            {searching ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {feedback ? (
        <p
          className={`mt-3 rounded-control border px-3 py-2 text-sm ${
            feedback.tone === 'error'
              ? 'border-danger/30 bg-danger-bg text-danger'
              : 'border-line-strong bg-brand-50 text-brand-700'
          }`}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      ) : null}

      <div className="mt-4 flex items-start gap-3 border-t border-line pt-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600">
          <Info className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">How to view student information</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Select the student&apos;s branch, enter the roll number exactly as printed on the
            college record, and press Search. You will be taken to the student&apos;s Overview
            tab, where the Attendance, Results and Fees tabs are also available. This page is
            read-only.
          </p>
        </div>
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Overview                                                                    */
/* -------------------------------------------------------------------------- */

function OverviewTab({ profile }: { profile: StudentProfile }) {
  const attendance = profile.attendance;

  return (
    <div className="space-y-5">
      <Panel title="Attendance summary">
        {attendance ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <KpiCard label="Overall" value={pct(attendance.attendance_pct)} accent="violet" />
              <KpiCard label="Sessions" value={attendance.total_sessions} accent="periwinkle" />
              <KpiCard label="Present" value={attendance.present} accent="sage" />
              <KpiCard label="Late" value={attendance.late} accent="periwinkle" />
              <KpiCard label="Absent" value={attendance.absent} accent="rose" />
            </div>
            <p className="mt-3 text-xs text-muted">
              Overall % = (present + late) ÷ total submitted sessions.
            </p>
          </>
        ) : (
          <p className="py-3 text-sm text-muted">No submitted attendance records yet.</p>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Personal details">
          <dl>
            <InfoRow label="Full name" value={profile.full_name} />
            <InfoRow label="Date of birth" value={dateShort(profile.date_of_birth)} />
            <InfoRow label="Gender" value={profile.gender ?? '—'} />
            <InfoRow label="Guardian" value={profile.guardian_name ?? '—'} />
            <InfoRow label="Phone" value={profile.phone ?? '—'} />
            <InfoRow label="Email" value={profile.email ?? '—'} />
            <InfoRow label="Address" value={profile.address ?? '—'} />
          </dl>
        </Panel>

        <Panel title="Academic details">
          <dl>
            <InfoRow
              label="Roll number"
              value={<span className="font-mono text-brand-600">{profile.roll_number}</span>}
            />
            <InfoRow
              label="Branch"
              value={`${profile.branch_name} (${profile.branch_code})`}
            />
            <InfoRow label="Class / Section" value={profile.class_section ?? '—'} />
            <InfoRow label="Year of study" value={profile.year_of_study ?? '—'} />
            <InfoRow label="Academic year" value={profile.academic_year ?? '—'} />
            <InfoRow label="Admission date" value={dateShort(profile.admission_date)} />
            <InfoRow
              label="Enrollment status"
              value={profile.enrollment_status ?? (profile.is_active ? 'Active' : 'Inactive')}
            />
          </dl>
        </Panel>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Attendance                                                                  */
/* -------------------------------------------------------------------------- */

const ATTENDANCE_STATUS_STYLE: Record<string, string> = {
  present: 'bg-success-bg text-success',
  late: 'bg-warning-bg text-warning',
  absent: 'bg-danger-bg text-danger',
  excused: 'bg-brand-50 text-brand-700',
  on_duty: 'bg-brand-50 text-brand-700',
};

function AttendanceTab({
  studentId,
  summary,
}: {
  studentId: number;
  summary: AttendanceSummary | null;
}) {
  const [rows, setRows] = useState<AttendanceHistoryEntry[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await demoGet<AttendanceHistoryEntry[]>(`/students/${studentId}/attendance/history`));
    } catch (err) {
      setError(err);
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <Panel title="Attendance (submitted sessions only)">
        {summary ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <KpiCard label="Overall" value={pct(summary.attendance_pct)} accent="violet" />
              <KpiCard label="Sessions" value={summary.total_sessions} accent="periwinkle" />
              <KpiCard label="Present" value={summary.present} accent="sage" />
              <KpiCard label="Late" value={summary.late} accent="periwinkle" />
              <KpiCard label="Absent" value={summary.absent} accent="rose" />
            </div>
            <p className="mt-3 text-xs text-muted">
              Overall % = (present + late) ÷ total submitted sessions.
            </p>
          </>
        ) : (
          <p className="py-3 text-sm text-muted">No attendance summary available.</p>
        )}
      </Panel>

      <Panel title="Attendance history by date">
        {loading ? (
          <Spinner label="Loading attendance history…" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void load()} />
        ) : !rows || rows.length === 0 ? (
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
                {rows.map((row, index) => (
                  <tr key={`${row.attendance_date}-${row.subject_code ?? 'all'}-${index}`}>
                    <td className="py-2 pr-3 text-ink">{dateShort(row.attendance_date)}</td>
                    <td className="py-2 pr-3 text-muted">
                      {row.subject_code
                        ? `${row.subject_name ?? ''} (${row.subject_code})`.trim()
                        : '—'}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          ATTENDANCE_STATUS_STYLE[row.status] ?? 'bg-brand-50 text-brand-700'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-muted">{row.remarks ?? '—'}</td>
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

/* -------------------------------------------------------------------------- */
/* Results                                                                     */
/* -------------------------------------------------------------------------- */

function ResultsTab({ rows }: { rows: ResultSummary[] }) {
  if (rows.length === 0) {
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
              <th className="pb-2 pr-3 font-medium">Status</th>
              <th className="pb-2 font-medium">Published</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, index) => (
              <tr key={`${row.exam_title}-${row.subject_code}-${index}`}>
                <td className="py-2 pr-3 text-ink">{row.exam_title}</td>
                <td className="py-2 pr-3 text-muted">
                  {row.subject_name} ({row.subject_code})
                </td>
                <td className="py-2 pr-3 text-right font-semibold text-ink">
                  {row.is_absent ? 'Absent' : `${row.marks_obtained ?? '—'} / ${row.max_marks}`}
                </td>
                <td className="py-2 pr-3">
                  <span className="rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-semibold text-success">
                    {row.status}
                  </span>
                </td>
                <td className="py-2 text-xs text-muted">{dateShort(row.published_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Fees                                                                        */
/* -------------------------------------------------------------------------- */

function FeesTab({
  studentId,
  summary,
}: {
  studentId: number;
  summary: StudentProfile['fee'];
}) {
  const [detail, setDetail] = useState<StudentFeesOut | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await demoGet<StudentFeesOut>(`/students/${studentId}/fees`));
    } catch (err) {
      setError(err);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const obligations = detail?.obligations ?? [];
  const payments = detail?.payments ?? [];

  return (
    <div className="space-y-5">
      <Panel title="Fee status">
        {summary ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label="Total" value={inrExact(summary.total_amount)} accent="periwinkle" />
            <KpiCard label="Paid" value={inrExact(summary.paid_amount)} accent="sage" />
            <KpiCard label="Outstanding" value={inrExact(summary.pending_amount)} accent="rose" />
            <KpiCard
              label="Status"
              value={summary.status}
              hint={dateShort(summary.due_date)}
              accent="violet"
            />
          </div>
        ) : (
          <p className="py-3 text-sm text-muted">No fee information available.</p>
        )}
      </Panel>

      {loading ? (
        <Panel title="Fee breakdown">
          <Spinner label="Loading fee details…" />
        </Panel>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void load()} />
      ) : (
        <>
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
                    {obligations.map((row) => (
                      <tr key={row.id}>
                        <td className="py-2 pr-3 text-ink">{row.fee_structure_name}</td>
                        <td className="py-2 pr-3 text-right text-ink">
                          {inrExact(row.total_amount)}
                        </td>
                        <td className="py-2 pr-3 text-right text-ink">
                          {inrExact(row.paid_amount)}
                        </td>
                        <td className="py-2 pr-3 text-right text-ink">
                          {inrExact(row.pending_amount)}
                        </td>
                        <td className="py-2 text-xs text-muted">{row.status}</td>
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
                    {payments.map((row) => (
                      <tr key={row.id}>
                        <td className="py-2 pr-3 font-mono text-xs text-brand-600">
                          {row.receipt_number}
                        </td>
                        <td className="py-2 pr-3 text-ink">{dateTime(row.paid_at)}</td>
                        <td className="py-2 pr-3 text-muted">{row.method}</td>
                        <td className="py-2 pr-3 text-right font-semibold text-ink">
                          {inrExact(row.amount)}
                        </td>
                        <td className="py-2 text-xs text-muted">{row.status}</td>
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
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

function DemoDisabled() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <StatePanel
        icon={<ShieldAlert className="h-10 w-10 text-brand-500" aria-hidden />}
        title="Student lookup is unavailable"
        description="The public student lookup runs only in demo mode. On a production deployment, records are available through the college office."
        action={
          <Link to="/" className={buttonClass({ variant: 'secondary' })}>
            Back to home
          </Link>
        }
      />
    </div>
  );
}

function StudentInfoContent() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchesError, setBranchesError] = useState<unknown>(null);
  const [branchesLoading, setBranchesLoading] = useState(true);

  const [branch, setBranch] = useState('');
  const [roll, setRoll] = useState('');
  const [searching, setSearching] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'info'; message: string } | null>(
    null,
  );

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<unknown>(null);

  const selectedId = Number(searchParams.get('student'));
  const hasSelection = Number.isInteger(selectedId) && selectedId > 0;
  const tabParam = searchParams.get('tab');
  const tab: Tab = isTab(tabParam) ? tabParam : 'overview';

  const loadBranches = useCallback(async () => {
    setBranchesLoading(true);
    setBranchesError(null);
    try {
      const rows = await get<BranchOut[]>('/meta/branches');
      setBranches(rows.map((item) => ({ id: item.id, code: item.code, name: item.name })));
    } catch (err) {
      setBranchesError(err);
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  const loadProfile = useCallback(async () => {
    if (!hasSelection) {
      setProfile(null);
      setProfileError(null);
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    try {
      setProfile(await demoGet<StudentProfile>(`/students/${selectedId}`));
    } catch (err) {
      setProfileError(err);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [hasSelection, selectedId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const onSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const wantedBranch = branch.trim();
    const wantedRoll = roll.trim().toUpperCase();
    if (!wantedBranch || !wantedRoll) {
      setFeedback({ tone: 'info', message: 'Select a branch and enter the roll number.' });
      return;
    }

    setSearching(true);
    try {
      const match = await demoGet<ParentDirectoryItem>('/lookup', {
        branch_id: Number(wantedBranch),
        roll_number: wantedRoll,
      });
      setSearchParams({ student: String(match.student_id), tab: 'overview' });
    } catch (err) {
      const api = err instanceof ApiError ? err : null;
      setFeedback({
        tone: 'error',
        message:
          api?.code === 'NO_STUDENT'
            ? `No student found for roll number ${wantedRoll} in the selected branch. Check the branch and roll number and try again.`
            : api?.status === 404
              ? 'The demo student lookup is not enabled on this server.'
              : api?.message ?? 'Could not reach the server. Please try again.',
      });
    } finally {
      setSearching(false);
    }
  };

  const clearSelection = () => {
    setFeedback(null);
    setSearchParams({});
  };

  const setTab = (next: Tab) => {
    if (!hasSelection) return;
    setSearchParams({ student: String(selectedId), tab: next });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-ink">Student Info</h2>
        <p className="text-sm text-muted">
          {hasSelection
            ? 'Read-only student record. Use the tabs to view attendance, results and fees.'
            : 'Search by branch and roll number to view a student’s read-only record.'}
        </p>
      </div>

      {!hasSelection ? (
        <>
          {branchesLoading ? (
            <Spinner label="Loading branches…" />
          ) : branchesError ? (
            <ErrorState error={branchesError} onRetry={() => void loadBranches()} />
          ) : (
            <SearchCard
              branches={branches}
              branch={branch}
              roll={roll}
              searching={searching}
              feedback={feedback}
              onBranchChange={setBranch}
              onRollChange={setRoll}
              onSubmit={onSearch}
            />
          )}

          <CollegeOverview />
        </>
      ) : profileLoading ? (
        <Spinner label="Loading student record…" />
      ) : profileError ? (
        <div className="space-y-3">
          <ErrorState
            title="Student record unavailable"
            error={profileError}
            onRetry={() => void loadProfile()}
          />
          <button type="button" className="btn-ghost" onClick={clearSelection}>
            <Search className="h-4 w-4" />
            Back to student search
          </button>
        </div>
      ) : profile ? (
        <>
          {/* Selected student summary */}
          <div className="glass-card flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-450 text-xl font-bold text-white">
                {profile.full_name.charAt(0)}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-ink">{profile.full_name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      profile.is_active
                        ? 'bg-success-bg text-success'
                        : 'bg-warning-bg text-warning'
                    }`}
                  >
                    {profile.is_active ? 'active' : 'inactive'}
                  </span>
                  <span className="rounded-full border border-line-strong bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                    Read-only
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  <span className="font-mono text-brand-600">{profile.roll_number}</span>
                  {' · '}
                  {profile.branch_name} ({profile.branch_code})
                  {profile.class_section ? ` · ${profile.class_section}` : ''}
                  {profile.academic_year ? ` · ${profile.academic_year}` : ''}
                </p>
              </div>
            </div>

            <button type="button" className="btn-ghost" onClick={clearSelection}>
              <Search className="h-4 w-4" />
              Search another student
            </button>
          </div>

          {/* Tabs (kept in the URL so refresh preserves the section) */}
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Student information sections"
          >
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  tab === item.id ? 'nav-active' : 'bg-white/70 text-ink hover:bg-white'
                }`}
                onClick={() => setTab(item.id)}
              >
                {item.id === 'overview' ? <UserRound className="h-4 w-4" /> : null}
                {item.id === 'attendance' ? <CalendarCheck2 className="h-4 w-4" /> : null}
                {item.id === 'results' ? <ClipboardList className="h-4 w-4" /> : null}
                {item.id === 'fees' ? <Wallet className="h-4 w-4" /> : null}
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'overview' ? <OverviewTab profile={profile} /> : null}
          {tab === 'attendance' ? (
            <AttendanceTab studentId={profile.id} summary={profile.attendance} />
          ) : null}
          {tab === 'results' ? <ResultsTab rows={profile.published_results} /> : null}
          {tab === 'fees' ? <FeesTab studentId={profile.id} summary={profile.fee} /> : null}
        </>
      ) : (
        <EmptyState
          title="Student record unavailable"
          hint="The selected student could not be loaded. Search again or contact the college office."
        />
      )}
    </div>
  );
}

export default function StudentInfoPage(): JSX.Element {
  if (!DEMO_OPEN_PARENT) return <DemoDisabled />;
  return <StudentInfoContent />;
}

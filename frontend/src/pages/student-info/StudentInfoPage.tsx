/**
 * Student Info — public, read-only lookup page for parents/students.
 *
 * URL-driven so refresh and bookmarks work:
 *   /student-info                        → branch + roll number search
 *   /student-info?student=<id>&tab=<tab> → read-only record for one student
 *
 * Data comes from the shared frontend sample dataset (25 fictional students)
 * so the demo works without a backend and stays consistent with the dashboard.
 * Nothing here can create or change a record.
 */
import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarCheck2,
  ClipboardList,
  Info,
  Search,
  UserRound,
  Wallet,
} from 'lucide-react';
import {
  SAMPLE_BRANCHES,
  findSampleStudent,
  getSampleAttendanceHistory,
  getSampleAttendanceSummary,
  getSampleFeeDetail,
  getSampleFeeSummary,
  getSampleResults,
  getSampleStudent,
  type SampleStudent,
} from '@/shared/data/sampleData';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { KpiCard, Panel } from '@/components/ui/Panel';
import { dateShort, dateTime, inrExact, pct } from '@/shared/lib/format';

const DEFAULT_BRANCHES: BranchOption[] = SAMPLE_BRANCHES.map(({ code, name }) => ({ code, name }));

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'results', label: 'Results' },
  { id: 'fees', label: 'Fees' },
] as const;

type Tab = (typeof TABS)[number]['id'];

interface BranchOption {
  code: string;
  name: string;
}

function isTab(value: string | null): value is Tab {
  return TABS.some((tab) => tab.id === value);
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-b border-periwinkle/20 py-2.5 last:border-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-plum">{value ?? '—'}</dd>
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
      <form className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={onSubmit}>
        <div>
          <label htmlFor="si-branch" className="mb-1 block text-xs font-medium text-muted">
            Branch <span className="text-rose">*</span>
          </label>
          <select
            id="si-branch"
            className="surface w-full rounded-xl px-3 py-2 text-sm text-plum"
            value={branch}
            required
            onChange={(event) => onBranchChange(event.target.value)}
          >
            <option value="">Select branch</option>
            {branches.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="si-roll" className="mb-1 block text-xs font-medium text-muted">
            Roll Number <span className="text-rose">*</span>
          </label>
          <input
            id="si-roll"
            className="surface w-full rounded-xl px-3 py-2 font-mono text-sm text-plum placeholder:font-sans placeholder:text-muted"
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
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
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
          className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
            feedback.tone === 'error'
              ? 'border-rose/30 bg-rose/10 text-rose'
              : 'border-mint bg-mist/70 text-forest'
          }`}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      ) : null}

      <div className="mt-4 flex items-start gap-3 border-t border-mint/70 pt-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mist text-forest">
          <Info className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-forest-dark">How to view student information</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Select the student&apos;s branch, enter the roll number exactly as printed on the college
            record, and press Search. You will be taken to the student&apos;s Overview tab, where the
            Attendance, Results and Fees tabs are also available. This page is read-only.
          </p>
        </div>
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Overview                                                                    */
/* -------------------------------------------------------------------------- */

function OverviewTab({ profile }: { profile: SampleStudent }) {
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
            <InfoRow
              label="Guardian"
              value={
                profile.guardian_name
                  ? `${profile.guardian_name} (${profile.guardian_relation})`
                  : '—'
              }
            />
            <InfoRow label="Guardian phone" value={profile.guardian_phone ?? '—'} />
            <InfoRow label="Phone" value={profile.phone ?? '—'} />
            <InfoRow label="Email" value={profile.email ?? '—'} />
            <InfoRow label="Address" value={profile.address ?? '—'} />
          </dl>
        </Panel>

        <Panel title="Academic details">
          <dl>
            <InfoRow
              label="Roll number"
              value={<span className="font-mono text-violet">{profile.roll_number}</span>}
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
  present: 'bg-sage/15 text-sage',
  late: 'bg-periwinkle/25 text-violet',
  absent: 'bg-rose/15 text-rose',
  excused: 'bg-peach/70 text-plum',
  on_duty: 'bg-peach/70 text-plum',
};

function AttendanceTab({ studentId }: { studentId: number }) {
  const data = getSampleAttendanceSummary(studentId);
  const rows = getSampleAttendanceHistory(studentId);

  return (
    <div className="space-y-5">
      <Panel title="Attendance (submitted sessions only)">
        {data ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <KpiCard label="Overall" value={pct(data.attendance_pct)} accent="violet" />
              <KpiCard label="Sessions" value={data.total_sessions} accent="periwinkle" />
              <KpiCard label="Present" value={data.present} accent="sage" />
              <KpiCard label="Late" value={data.late} accent="periwinkle" />
              <KpiCard label="Absent" value={data.absent} accent="rose" />
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
        {rows.length === 0 ? (
          <p className="py-3 text-sm text-muted">No submitted attendance records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-periwinkle/30 text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3 font-medium">Date</th>
                  <th className="pb-2 pr-3 font-medium">Subject</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-periwinkle/20">
                {rows.map((row, index) => (
                  <tr key={`${row.attendance_date}-${row.subject_code ?? 'all'}-${index}`}>
                    <td className="py-2 pr-3 text-plum">{dateShort(row.attendance_date)}</td>
                    <td className="py-2 pr-3 text-muted">
                      {row.subject_code
                        ? `${row.subject_name ?? ''} (${row.subject_code})`.trim()
                        : '—'}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          ATTENDANCE_STATUS_STYLE[row.status] ?? 'bg-periwinkle/20 text-plum'
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

function ResultsTab({ studentId }: { studentId: number }) {
  const rows = getSampleResults(studentId);
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
            <tr className="border-b border-periwinkle/30 text-xs uppercase tracking-wide text-muted">
              <th className="pb-2 pr-3 font-medium">Exam</th>
              <th className="pb-2 pr-3 font-medium">Subject</th>
              <th className="pb-2 pr-3 text-right font-medium">Marks</th>
              <th className="pb-2 pr-3 font-medium">Status</th>
              <th className="pb-2 font-medium">Published</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-periwinkle/20">
            {rows.map((row, index) => (
              <tr key={`${row.exam_title}-${row.subject_code}-${index}`}>
                <td className="py-2 pr-3 text-plum">{row.exam_title}</td>
                <td className="py-2 pr-3 text-muted">
                  {row.subject_name} ({row.subject_code})
                </td>
                <td className="py-2 pr-3 text-right font-semibold text-plum">
                  {row.is_absent ? 'Absent' : `${row.marks_obtained ?? '—'} / ${row.max_marks}`}
                </td>
                <td className="py-2 pr-3">
                  <span className="rounded-full bg-sage/20 px-2 py-0.5 text-[11px] font-semibold text-sage">
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

function FeesTab({ studentId }: { studentId: number }) {
  const fee = getSampleFeeSummary(studentId);
  const detail = getSampleFeeDetail(studentId);
  const obligations = detail?.obligations ?? [];
  const payments = detail?.payments ?? [];

  return (
    <div className="space-y-5">
      <Panel title="Fee status">
        {fee ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label="Total" value={inrExact(fee.total_amount)} accent="periwinkle" />
            <KpiCard label="Paid" value={inrExact(fee.paid_amount)} accent="sage" />
            <KpiCard label="Outstanding" value={inrExact(fee.pending_amount)} accent="rose" />
            <KpiCard label="Status" value={fee.status} hint={dateShort(fee.due_date)} accent="violet" />
          </div>
        ) : (
          <p className="py-3 text-sm text-muted">No fee information available.</p>
        )}
      </Panel>

      <Panel title="Fee breakdown">
        {obligations.length === 0 ? (
          <p className="py-3 text-sm text-muted">No fee obligations found for this student.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-periwinkle/30 text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3 font-medium">Head</th>
                  <th className="pb-2 pr-3 text-right font-medium">Total</th>
                  <th className="pb-2 pr-3 text-right font-medium">Paid</th>
                  <th className="pb-2 pr-3 text-right font-medium">Pending</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-periwinkle/20">
                {obligations.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-3 text-plum">{row.fee_structure_name}</td>
                    <td className="py-2 pr-3 text-right text-plum">{inrExact(row.total_amount)}</td>
                    <td className="py-2 pr-3 text-right text-plum">{inrExact(row.paid_amount)}</td>
                    <td className="py-2 pr-3 text-right text-plum">{inrExact(row.pending_amount)}</td>
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
                <tr className="border-b border-periwinkle/30 text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3 font-medium">Receipt</th>
                  <th className="pb-2 pr-3 font-medium">Date</th>
                  <th className="pb-2 pr-3 font-medium">Method</th>
                  <th className="pb-2 pr-3 text-right font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-periwinkle/20">
                {payments.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-3 font-mono text-xs text-violet">{row.receipt_number}</td>
                    <td className="py-2 pr-3 text-plum">{dateTime(row.paid_at)}</td>
                    <td className="py-2 pr-3 text-muted">{row.method}</td>
                    <td className="py-2 pr-3 text-right font-semibold text-plum">
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
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function StudentInfoPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();

  const [branch, setBranch] = useState('');
  const [roll, setRoll] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'info'; message: string } | null>(null);

  const selectedId = Number(searchParams.get('student'));
  const hasSelection = Number.isInteger(selectedId) && selectedId > 0;
  const tabParam = searchParams.get('tab');
  const tab: Tab = isTab(tabParam) ? tabParam : 'overview';

  // Read straight from the shared sample dataset — no network round-trip, so
  // the demo works even when the API server is not running.
  const profile = hasSelection ? getSampleStudent(selectedId) : null;
  const profileError =
    hasSelection && !profile
      ? new Error(`No sample student record exists for id ${selectedId}. Please search again.`)
      : null;

  const onSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const wantedBranch = branch.trim();
    const wantedRoll = roll.trim().toUpperCase();
    if (!wantedBranch || !wantedRoll) {
      setFeedback({ tone: 'info', message: 'Select a branch and enter the roll number.' });
      return;
    }

    // Accepts both BIP25001 (seed convention) and BIPC25001.
    const match = findSampleStudent(wantedBranch, wantedRoll);
    if (!match) {
      setFeedback({
        tone: 'error',
        message: `No student found for roll number ${wantedRoll} in ${branch}. Check the branch and roll number and try again.`,
      });
      return;
    }

    setFeedback(null);
    setSearchParams({ student: String(match.student_id), tab: 'overview' });
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
        <h2 className="text-2xl font-bold text-forest-dark">Student Info</h2>
        <p className="text-sm text-muted">
          {hasSelection
            ? 'Read-only student record. Use the tabs to view attendance, results and fees.'
            : 'Search by branch and roll number to view a student\u2019s read-only record.'}
        </p>
      </div>

      {!hasSelection ? (
        <>
          <SearchCard
            branches={DEFAULT_BRANCHES}
            branch={branch}
            roll={roll}
            searching={false}
            feedback={feedback}
            onBranchChange={setBranch}
            onRollChange={setRoll}
            onSubmit={onSearch}
          />

          <EmptyState
            title="No student selected"
            hint="Choose a branch, enter a roll number, and press Search to open the student's Overview."
          />
        </>
      ) : profileError ? (
        <div className="space-y-3">
          <ErrorState error={profileError} />
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
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-forest to-leaf text-xl font-bold text-white">
                {profile.full_name.charAt(0)}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-forest-dark">{profile.full_name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      profile.is_active ? 'bg-sage/20 text-sage' : 'bg-peach/70 text-violet-600'
                    }`}
                  >
                    {profile.is_active ? 'active' : 'inactive'}
                  </span>
                  <span className="rounded-full border border-mint bg-mist/70 px-2 py-0.5 text-[11px] font-semibold text-forest">
                    Read-only
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  <span className="font-mono text-violet">{profile.roll_number}</span>
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
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Student information sections">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  tab === item.id ? 'nav-active' : 'bg-white/70 text-plum hover:bg-white'
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
          {tab === 'attendance' ? <AttendanceTab studentId={profile.id} /> : null}
          {tab === 'results' ? <ResultsTab studentId={profile.id} /> : null}
          {tab === 'fees' ? <FeesTab studentId={profile.id} /> : null}
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

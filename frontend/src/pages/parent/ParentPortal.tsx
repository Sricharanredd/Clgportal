/**
 * Parent portal — completely separate from the staff shell.
 *
 * Flow: branch + roll lookup (masked identity) → access-code verification →
 * read-only views for linked children. Parent tokens are memory-only and are
 * restarted (not refreshed) when they expire.
 */
import { useCallback, useEffect, useState } from 'react';
import { GraduationCap, Lock, Search, UserRound } from 'lucide-react';
import { get } from '@/shared/api/client';
import type {
  AnnouncementPage,
  AttendanceSummary,
  BranchOut,
  FeeSummary,
  ParentChildSummary,
  ParentLookupResponse,
  ParentSessionResponse,
  ResultSummary,
  StudentProfile,
} from '@/shared/api/types';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/States';
import { KpiCard, Panel } from '@/components/ui/Panel';
import { ApiError, parentGet, parentPost, setParentToken } from './parentClient';
import { dateShort, dateTime, inrExact, pct } from '@/shared/lib/format';

type Step = 'lookup' | 'home';

export default function ParentPortal(): JSX.Element {
  const [step, setStep] = useState<Step>('lookup');
  const [session, setSession] = useState<ParentSessionResponse | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const endSession = useCallback((message?: string) => {
    setParentToken(null);
    setSession(null);
    setStep('lookup');
    if (message) setNotice(message);
  }, []);

  const onVerified = (res: ParentSessionResponse) => {
    setParentToken(res.access_token);
    setSession(res);
    setNotice(null);
    setStep('home');
  };

  return (
    <div className="min-h-screen">
      {/* Parent shell header (no staff sidebar) */}
      <header className="glass sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-rose text-white">
            <GraduationCap className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold leading-tight text-plum">Prism College — Parent Portal</p>
            <p className="text-xs text-muted">Read-only access to your child's records</p>
          </div>
        </div>
        {session ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-plum sm:inline">
              <UserRound className="mr-1 inline h-4 w-4 text-violet" aria-hidden />
              {session.parent_name}
            </span>
            <button type="button" className="btn-ghost" onClick={() => endSession()}>
              Sign out
            </button>
          </div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8">
        {notice ? (
          <p
            className="mb-5 rounded-xl border border-peach bg-peach/40 px-4 py-3 text-sm text-plum"
            role="status"
          >
            {notice}
          </p>
        ) : null}

        {step === 'lookup' ? (
          <LookupFlow onVerified={onVerified} />
        ) : session ? (
          <Home session={session} onExpired={() => endSession('Session expired — please verify again.')} />
        ) : null}
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Lookup + access-code verification                                           */
/* -------------------------------------------------------------------------- */

function LookupFlow({ onVerified }: { onVerified: (s: ParentSessionResponse) => void }) {
  const [branches, setBranches] = useState<BranchOut[]>([]);
  const [branchId, setBranchId] = useState<string>('');
  const [roll, setRoll] = useState('');
  const [code, setCode] = useState('');
  const [lookup, setLookup] = useState<ParentLookupResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void get<BranchOut[]>('/meta/branches')
      .then((rows) => {
        setBranches(rows);
        if (rows.length > 0) setBranchId(String(rows[0].id));
      })
      .catch(() => setBranches([]));
  }, []);

  const doLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await parentPost<ParentLookupResponse>('/parent/lookup', {
        branch_id: Number(branchId),
        roll_number: roll.trim(),
      });
      setLookup(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lookup failed.');
    } finally {
      setBusy(false);
    }
  };

  const doVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookup) return;
    setBusy(true);
    setError(null);
    try {
      const res = await parentPost<ParentSessionResponse>('/parent/verify', {
        lookup_token: lookup.lookup_token,
        access_code: code.trim(),
      });
      onVerified(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-plum">Find your child's record</h1>
        <p className="mt-1 text-sm text-muted">
          Enter the branch and roll number, then verify with the access code from the college
          office.
        </p>
      </div>

      {!lookup ? (
        <form className="glass-card space-y-4 rounded-2xl p-6" onSubmit={doLookup}>
          <div>
            <label htmlFor="p-branch" className="mb-1 block text-sm font-medium text-plum">
              Branch
            </label>
            <select
              id="p-branch"
              className="surface w-full rounded-xl px-3 py-2.5 text-sm text-plum"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              required
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="p-roll" className="mb-1 block text-sm font-medium text-plum">
              Roll number
            </label>
            <input
              id="p-roll"
              className="surface w-full rounded-xl px-3 py-2.5 text-sm text-plum placeholder:text-muted"
              placeholder="MPC25001"
              value={roll}
              onChange={(e) => setRoll(e.target.value)}
              required
              minLength={2}
            />
          </div>
          {error ? (
            <p className="rounded-xl border border-rose/40 bg-rose/10 px-3 py-2 text-sm text-plum" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            <Search className="h-4 w-4" />
            {busy ? 'Searching…' : 'Find student'}
          </button>
        </form>
      ) : (
        <form className="glass-card space-y-4 rounded-2xl p-6" onSubmit={doVerify}>
          <div className="surface rounded-xl p-4 text-center">
            <p className="text-lg font-semibold text-plum">{lookup.student.masked_name}</p>
            <p className="mt-0.5 text-sm text-muted">
              <span className="font-mono text-violet">{lookup.student.roll_number}</span> ·{' '}
              {lookup.student.branch_code}
              {lookup.student.class_section ? ` · ${lookup.student.class_section}` : ''}
            </p>
            <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted">
              <Lock className="h-3.5 w-3.5" aria-hidden />
              {lookup.hint}
            </p>
          </div>
          <div>
            <label htmlFor="p-code" className="mb-1 block text-sm font-medium text-plum">
              Access code
            </label>
            <input
              id="p-code"
              className="surface w-full rounded-xl px-3 py-2.5 text-sm tracking-widest text-plum placeholder:text-muted"
              placeholder="DEMO-MPC25001"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
            />
          </div>
          {error ? (
            <p className="rounded-xl border border-rose/40 bg-rose/10 px-3 py-2 text-sm text-plum" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn-primary w-full" disabled={busy || code.trim().length < 4}>
            {busy ? 'Verifying…' : 'Verify & continue'}
          </button>
          <button
            type="button"
            className="btn-ghost w-full"
            onClick={() => {
              setLookup(null);
              setError(null);
              setCode('');
            }}
          >
            Use a different roll number
          </button>
        </form>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Authenticated home                                                          */
/* -------------------------------------------------------------------------- */

type Tab = 'profile' | 'attendance' | 'results' | 'fees' | 'announcements';

function Home({
  session,
  onExpired,
}: {
  session: ParentSessionResponse;
  onExpired: () => void;
}) {
  const [children, setChildren] = useState<ParentChildSummary[]>(session.children);
  const [selected, setSelected] = useState<number>(session.children[0]?.student_id ?? 0);
  const [tab, setTab] = useState<Tab>('profile');
  const [listError, setListError] = useState<unknown>(null);

  // Fresh, server-derived links (never trust the login-time snapshot alone).
  const loadChildren = useCallback(async () => {
    try {
      const rows = await parentGet<ParentChildSummary[]>('/parent/children');
      setChildren(rows);
      setSelected((cur) => (rows.some((c) => c.student_id === cur) ? cur : rows[0]?.student_id ?? 0));
      setListError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onExpired();
      else setListError(err);
    }
  }, [onExpired]);

  useEffect(() => {
    void loadChildren();
  }, [loadChildren]);

  if (listError) return <ErrorState error={listError} onRetry={() => void loadChildren()} />;
  if (children.length === 0) {
    return (
      <EmptyState
        title="No linked children"
        hint="Your access code is not linked to any student. Contact the college office."
      />
    );
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'profile', label: 'Profile' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'results', label: 'Results' },
    { id: 'fees', label: 'Fees' },
    { id: 'announcements', label: 'Announcements' },
  ];

  return (
    <div className="space-y-5">
      {/* Children selector */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Children">
        {children.map((c) => (
          <button
            key={c.student_id}
            type="button"
            role="tab"
            aria-selected={selected === c.student_id}
            className={`rounded-2xl border px-4 py-2 text-left text-sm transition ${
              selected === c.student_id
                ? 'border-violet bg-white/90 shadow-sm'
                : 'border-white/70 bg-white/50 hover:bg-white/80'
            }`}
            onClick={() => {
              setSelected(c.student_id);
              setTab('profile');
            }}
          >
            <span className="block font-semibold text-plum">{c.full_name}</span>
            <span className="block text-xs text-muted">
              <span className="font-mono">{c.roll_number}</span> · {c.branch_code}
              {c.class_section ? ` · ${c.class_section}` : ''}
            </span>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Child record sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === t.id ? 'nav-active' : 'bg-white/70 text-plum hover:bg-white'
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' ? <ProfileTab studentId={selected} onExpired={onExpired} /> : null}
      {tab === 'attendance' ? <AttendanceTab studentId={selected} onExpired={onExpired} /> : null}
      {tab === 'results' ? <ResultsTab studentId={selected} onExpired={onExpired} /> : null}
      {tab === 'fees' ? <FeesTab studentId={selected} onExpired={onExpired} /> : null}
      {tab === 'announcements' ? <AnnouncementsTab onExpired={onExpired} /> : null}
    </div>
  );
}

/** Shared loader wrapper for parent tabs. */
function useParentTab<T>(
  studentId: number,
  path: string,
  onExpired: () => void,
  enabled: boolean,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(enabled);

  const load = useCallback(async () => {
    if (!enabled || !studentId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await parentGet<T>(path));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onExpired();
      else setError(err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, path, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, loading, reload: load };
}

function ProfileTab({ studentId, onExpired }: { studentId: number; onExpired: () => void }) {
  const { data, error, loading } = useParentTab<StudentProfile>(
    studentId,
    `/parent/students/${studentId}/profile`,
    onExpired,
    true,
  );

  if (loading) return <Spinner label="Loading profile…" />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel title="Student" className="lg:col-span-1">
        <dl className="divide-y divide-periwinkle/15">
          {[
            ['Roll number', <span className="font-mono text-violet">{data.roll_number}</span>],
            ['Branch', `${data.branch_name} (${data.branch_code})`],
            ['Class', data.class_section ?? '—'],
            ['Academic year', data.academic_year ?? '—'],
            ['Admission date', dateShort(data.admission_date)],
            ['Date of birth', dateShort(data.date_of_birth)],
            ['Gender', data.gender ?? '—'],
            ['Guardian', data.guardian_name ?? '—'],
            ['Phone', data.phone ?? '—'],
            ['Address', data.address ?? '—'],
          ].map(([label, value], i) => (
            <div key={i} className="py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label as string}</dt>
              <dd className="mt-0.5 text-sm text-plum">{value as React.ReactNode}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <div className="space-y-5 lg:col-span-2">
        <Panel title="Attendance">
          {data.attendance ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <KpiCard label="Overall" value={pct(data.attendance.attendance_pct)} accent="violet" />
              <KpiCard label="Sessions" value={data.attendance.total_sessions} accent="periwinkle" />
              <KpiCard label="Present" value={data.attendance.present} accent="sage" />
              <KpiCard label="Late" value={data.attendance.late} accent="periwinkle" />
              <KpiCard label="Absent" value={data.attendance.absent} accent="rose" />
            </div>
          ) : (
            <p className="py-3 text-sm text-muted">No attendance recorded yet.</p>
          )}
        </Panel>

        <Panel title="Fees">
          {data.fee ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiCard label="Total" value={inrExact(data.fee.total_amount)} accent="periwinkle" />
              <KpiCard label="Paid" value={inrExact(data.fee.paid_amount)} accent="sage" />
              <KpiCard label="Pending" value={inrExact(data.fee.pending_amount)} accent="rose" />
              <KpiCard label="Status" value={data.fee.status} accent="violet" />
            </div>
          ) : (
            <p className="py-3 text-sm text-muted">No fee information available.</p>
          )}
        </Panel>

        <Panel title="Published results">
          {data.published_results.length === 0 ? (
            <p className="py-3 text-sm text-muted">
              No published results yet — results appear here only after the college publishes them.
            </p>
          ) : (
            <ResultTable results={data.published_results} />
          )}
        </Panel>
      </div>
    </div>
  );
}

function AttendanceTab({ studentId, onExpired }: { studentId: number; onExpired: () => void }) {
  const { data, error, loading } = useParentTab<AttendanceSummary>(
    studentId,
    `/parent/students/${studentId}/attendance`,
    onExpired,
    true,
  );

  if (loading) return <Spinner label="Loading attendance…" />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  return (
    <Panel title="Attendance (submitted sessions only)">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <KpiCard label="Overall" value={pct(data.attendance_pct)} accent="violet" />
        <KpiCard label="Sessions" value={data.total_sessions} accent="periwinkle" />
        <KpiCard label="Present" value={data.present} accent="sage" />
        <KpiCard label="Late" value={data.late} accent="periwinkle" />
        <KpiCard label="Absent" value={data.absent} accent="rose" />
      </div>
    </Panel>
  );
}

function ResultsTab({ studentId, onExpired }: { studentId: number; onExpired: () => void }) {
  const { data, error, loading } = useParentTab<ResultSummary[]>(
    studentId,
    `/parent/students/${studentId}/results`,
    onExpired,
    true,
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
      <ResultTable results={data} />
    </Panel>
  );
}

function ResultTable({ results }: { results: ResultSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-periwinkle/30 text-xs uppercase tracking-wide text-muted">
            <th className="pb-2 pr-3 font-medium">Exam</th>
            <th className="pb-2 pr-3 font-medium">Subject</th>
            <th className="pb-2 pr-3 text-right font-medium">Marks</th>
            <th className="pb-2 font-medium">Published</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-periwinkle/20">
          {results.map((r, i) => (
            <tr key={`${r.exam_title}-${r.subject_code}-${i}`}>
              <td className="py-2 pr-3 text-plum">{r.exam_title}</td>
              <td className="py-2 pr-3 text-muted">
                {r.subject_name} ({r.subject_code})
              </td>
              <td className="py-2 pr-3 text-right font-semibold text-plum">
                {r.is_absent ? 'Absent' : `${r.marks_obtained ?? '—'} / ${r.max_marks}`}
              </td>
              <td className="py-2 text-xs text-muted">{dateShort(r.published_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeesTab({ studentId, onExpired }: { studentId: number; onExpired: () => void }) {
  const { data, error, loading } = useParentTab<FeeSummary | null>(
    studentId,
    `/parent/students/${studentId}/fees`,
    onExpired,
    true,
  );

  if (loading) return <Spinner label="Loading fees…" />;
  if (error) return <ErrorState error={error} />;
  if (!data) return <EmptyState title="No fee record" hint="No obligation found for this student." />;

  return (
    <Panel title="Fee status">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total" value={inrExact(data.total_amount)} accent="periwinkle" />
        <KpiCard label="Paid" value={inrExact(data.paid_amount)} accent="sage" />
        <KpiCard label="Pending" value={inrExact(data.pending_amount)} accent="rose" />
        <KpiCard label="Status" value={data.status} hint={dateShort(data.due_date)} accent="violet" />
      </div>
      <p className="mt-4 text-xs text-muted">
        Payments are made at the college accounts office; this portal is read-only.
      </p>
    </Panel>
  );
}

function AnnouncementsTab({ onExpired }: { onExpired: () => void }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AnnouncementPage | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await parentGet<AnnouncementPage>('/announcements', { page, page_size: 6 }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onExpired();
      else setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, onExpired]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Spinner label="Loading announcements…" />;
  if (error) return <ErrorState error={error} onRetry={() => void load()} />;
  if (!data || data.items.length === 0) {
    return <EmptyState title="No announcements" hint="Notices from the college appear here." />;
  }

  return (
    <div className="space-y-4">
      <ul className="grid gap-4 md:grid-cols-2">
        {data.items.map((a) => (
          <li key={a.id} className="glass-card rounded-2xl p-4">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-plum">{a.title}</p>
              <span className="rounded-full bg-periwinkle/30 px-2 py-0.5 text-[11px] font-semibold text-violet">
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

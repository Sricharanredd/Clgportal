/**
 * Parent portal — completely separate from the staff shell.
 *
 * URL-driven flow (bookmarks and refresh work):
 *   /parent                    → branch + roll lookup (masked identity)
 *   /parent/student/:studentId → read-only tabs for one linked child
 *
 * Access policy: the backend decides whether an access code is required
 * (`verification_required` from /parent/lookup). In demo mode
 * (PARENT_VERIFICATION_ENABLED=false on the server) the verify call is made
 * automatically without a code; in production the code form is shown and the
 * server re-checks it. Parent tokens are memory + sessionStorage (per-tab)
 * and are restarted (not refreshed) when they expire. The studentId in the
 * URL is NOT authorization — every read is re-checked server-side against
 * the parent's linked students.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { GraduationCap, Home, Lock, LogOut, Search, UserRound } from 'lucide-react';
import { get } from '@/shared/api/client';
import type {
  AnnouncementPage,
  AttendanceHistoryEntry,
  AttendanceSummary,
  BranchOut,
  FeeSummary,
  ParentChildSummary,
  ParentLookupResponse,
  ParentSearchMatch,
  ParentSessionResponse,
  ResultSummary,
  StudentFeesOut,
  StudentProfile,
} from '@/shared/api/types';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/States';
import { KpiCard, Panel } from '@/components/ui/Panel';
import {
  ApiError,
  clearParentSession,
  getParentName,
  parentGet,
  parentPost,
  setParentSession,
} from './parentClient';
import { dateShort, dateTime, inrExact, pct } from '@/shared/lib/format';

type Tab = 'profile' | 'attendance' | 'results' | 'fees' | 'announcements';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'results', label: 'Results' },
  { id: 'fees', label: 'Fees' },
  { id: 'announcements', label: 'Announcements' },
];

export default function ParentPortal({ mode }: { mode: 'lookup' | 'student' }): JSX.Element {
  const navigate = useNavigate();
  const parentName = getParentName();

  const signOut = useCallback(() => {
    clearParentSession();
    navigate('/parent');
  }, [navigate]);

  return (
    <div className="min-h-screen">
      {/* Parent shell header (no staff sidebar) */}
      <header className="glass sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <Link to="/" className="flex items-center gap-2" aria-label="Prism College home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-rose text-white">
            <GraduationCap className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold leading-tight text-plum">Prism College — Parent Portal</p>
            <p className="text-xs text-muted">Read-only access to your child's records</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {parentName ? (
            <span className="hidden text-sm text-plum sm:inline">
              <UserRound className="mr-1 inline h-4 w-4 text-violet" aria-hidden />
              {parentName}
            </span>
          ) : null}
          {mode === 'student' ? (
            <Link to="/parent" className="btn-ghost">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search another student</span>
            </Link>
          ) : null}
          <Link to="/" className="btn-ghost">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          {parentName ? (
            <button type="button" className="btn-ghost" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8">
        {mode === 'lookup' ? <LookupPage /> : <StudentPage />}
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Lookup + access-code verification (/parent)                                 */
/* -------------------------------------------------------------------------- */

function LookupPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const noticeFromNav = (location.state as { notice?: string } | null)?.notice;

  const [mode, setMode] = useState<'roll' | 'name'>('roll');
  const [branches, setBranches] = useState<BranchOut[]>([]);
  const [branchId, setBranchId] = useState<string>('');
  const [roll, setRoll] = useState('');
  const [name, setName] = useState('');
  const [matches, setMatches] = useState<ParentSearchMatch[] | null>(null);
  const [code, setCode] = useState('');
  const [lookup, setLookup] = useState<ParentLookupResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(noticeFromNav ?? null);

  useEffect(() => {
    void get<BranchOut[]>('/meta/branches')
      .then((rows) => {
        setBranches(rows);
        if (rows.length > 0) setBranchId(String(rows[0].id));
      })
      .catch(() => setBranches([]));
  }, []);

  const openStudent = (res: ParentSessionResponse, studentId: number) => {
    setParentSession(res.access_token, res.parent_name);
    const linked = res.children.some((c) => c.student_id === studentId)
      ? studentId
      : res.children[0]?.student_id;
    if (linked) {
      navigate(`/parent/student/${linked}`);
    } else {
      setError('Your access is not linked to any student. Contact the college office.');
    }
  };

  /** Shared lookup→verify step, reused by roll search AND name-result pick. */
  const runLookup = async (branchNum: number, rollValue: string) => {
    const res = await parentPost<ParentLookupResponse>('/parent/lookup', {
      branch_id: branchNum,
      roll_number: rollValue.trim(),
    });
    if (res.verification_required) {
      // Production policy: the college access code must be verified.
      setLookup(res);
    } else {
      // Demo policy (server-configured): verify without a code.
      const session = await parentPost<ParentSessionResponse>('/parent/verify', {
        lookup_token: res.lookup_token,
        access_code: '',
      });
      openStudent(session, res.student.student_id);
    }
  };

  const doLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await runLookup(Number(branchId), roll);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lookup failed.');
    } finally {
      setBusy(false);
    }
  };

  const doNameSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    setMatches(null);
    try {
      const res = await parentPost<ParentSearchMatch[]>('/parent/search', {
        name: name.trim(),
        // Branch is an optional narrowing filter for name search.
        branch_id: branchId ? Number(branchId) : undefined,
      });
      setMatches(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Search failed.');
    } finally {
      setBusy(false);
    }
  };

  /** User picked a candidate → run the SAME lookup+verify flow for it. */
  const selectMatch = async (m: ParentSearchMatch) => {
    setBusy(true);
    setError(null);
    try {
      await runLookup(m.branch_id, m.roll_number);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lookup failed.');
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: 'roll' | 'name') => {
    setMode(next);
    setError(null);
    setMatches(null);
    setLookup(null);
    setCode('');
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
      openStudent(res, lookup.student.student_id);
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
          {lookup
            ? 'Confirm the student and verify to continue.'
            : 'Enter the branch and roll number, or search by name.'}
        </p>
      </div>

      {notice ? (
        <p
          className="rounded-xl border border-peach bg-peach/40 px-4 py-3 text-sm text-plum"
          role="status"
        >
          {notice}
        </p>
      ) : null}

      {!lookup ? (
        <form
          className="glass-card space-y-4 rounded-2xl p-6"
          onSubmit={mode === 'roll' ? doLookup : doNameSearch}
        >
          {/* Search-mode toggle (Roll number vs Student name) */}
          <div
            className="flex rounded-xl border border-periwinkle/40 bg-white/60 p-1"
            role="group"
            aria-label="Search mode"
          >
            {(['roll', 'name'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => switchMode(m)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  mode === m ? 'bg-white text-plum shadow-sm' : 'text-muted hover:text-plum'
                }`}
              >
                {m === 'roll' ? 'Roll number' : 'Student name'}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="p-branch" className="mb-1 block text-sm font-medium text-plum">
              Branch
              {mode === 'name' ? (
                <span className="ml-1 text-xs font-normal text-muted">(optional)</span>
              ) : null}
            </label>
            <select
              id="p-branch"
              className="surface w-full rounded-xl px-3 py-2.5 text-sm text-plum"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              required={mode === 'roll'}
            >
              {mode === 'name' ? <option value="">All branches</option> : null}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {mode === 'roll' ? (
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
          ) : (
            <div>
              <label htmlFor="p-name" className="mb-1 block text-sm font-medium text-plum">
                Student name
              </label>
              <input
                id="p-name"
                className="surface w-full rounded-xl px-3 py-2.5 text-sm text-plum placeholder:text-muted"
                placeholder="Enter roll number or student name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>
          )}

          {error ? (
            <p className="rounded-xl border border-rose/40 bg-rose/10 px-3 py-2 text-sm text-plum" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={busy || branches.length === 0}
          >
            <Search className="h-4 w-4" />
            {busy ? 'Searching…' : 'Find student'}
          </button>
          {branches.length === 0 ? (
            <p className="text-center text-xs text-muted">Loading branches…</p>
          ) : null}

          {/* Name-search result list: user must pick a candidate to continue. */}
          {mode === 'name' && matches ? (
            matches.length === 0 ? (
              <p className="text-center text-sm text-muted">
                No students match that name.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  {matches.length} match{matches.length === 1 ? '' : 'es'} — select your child
                </p>
                <ul className="space-y-2">
                  {matches.map((m) => (
                    <li key={`${m.branch_id}-${m.roll_number}`}>
                      <button
                        type="button"
                        onClick={() => void selectMatch(m)}
                        disabled={busy}
                        className="surface w-full rounded-xl px-4 py-3 text-left transition hover:border-violet/60 disabled:opacity-60"
                      >
                        <p className="text-sm font-semibold text-plum">{m.masked_name}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          <span className="font-mono text-violet">{m.roll_number}</span> ·{' '}
                          {m.branch_code}
                          {m.class_section ? ` · ${m.class_section}` : ''}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          ) : null}
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
              placeholder="College-issued code"
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
            Use a different search
          </button>
        </form>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Student portal (/parent/student/:studentId)                                 */
/* -------------------------------------------------------------------------- */

function StudentPage(): JSX.Element {
  const navigate = useNavigate();
  const { studentId: studentIdParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const studentId = Number(studentIdParam);
  const tabParam = searchParams.get('tab');
  const tab: Tab = TABS.some((t) => t.id === tabParam) ? (tabParam as Tab) : 'profile';

  const [children, setChildren] = useState<ParentChildSummary[] | null>(null);
  const [listError, setListError] = useState<unknown>(null);

  const endSession = useCallback(
    (message: string) => {
      clearParentSession();
      navigate('/parent', { state: { notice: message } });
    },
    [navigate],
  );

  // Fresh, server-derived links (never trust the login-time snapshot alone).
  const loadChildren = useCallback(async () => {
    try {
      setChildren(await parentGet<ParentChildSummary[]>('/parent/children'));
      setListError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        endSession('Session expired — please search and verify again.');
      } else {
        setListError(err);
      }
    }
  }, [endSession]);

  useEffect(() => {
    void loadChildren();
  }, [loadChildren]);

  // Guard rails for the URL itself (the backend re-checks authorization).
  useEffect(() => {
    if (!Number.isInteger(studentId) || studentId < 1) {
      navigate('/parent', { replace: true });
    }
  }, [studentId, navigate]);

  if (!Number.isInteger(studentId) || studentId < 1) return <Spinner />;
  if (listError) return <ErrorState error={listError} onRetry={() => void loadChildren()} />;
  if (children === null) return <Spinner label="Loading your children…" />;

  const child = children.find((c) => c.student_id === studentId);
  if (!child) {
    // Not linked to this parent (or removed) — backend would 404 every read.
    return (
      <EmptyState
        title="Student not available"
        hint="This student is not linked to your account. Search again or contact the college office."
      />
    );
  }

  const setTab = (next: Tab) => {
    setSearchParams(next === 'profile' ? {} : { tab: next }, { replace: false });
  };

  return (
    <div className="space-y-5">
      {/* Selected student summary (privacy-appropriate: verified parents only) */}
      <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet/20 to-periwinkle/30 text-violet">
            <UserRound className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-base font-bold text-plum">{child.full_name}</p>
            <p className="text-sm text-muted">
              <span className="font-mono text-violet">{child.roll_number}</span> · {child.branch_code}
              {child.class_section ? ` · ${child.class_section}` : ''}
            </p>
          </div>
        </div>
        {/* Switch between linked children */}
        {children.length > 1 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Switch child">
            {children.map((c) => (
              <Link
                key={c.student_id}
                to={`/parent/student/${c.student_id}`}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  c.student_id === studentId
                    ? 'border-violet bg-white/90 text-plum'
                    : 'border-white/70 bg-white/50 text-plum hover:bg-white/80'
                }`}
              >
                {c.roll_number}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {/* Tabs (kept in the URL so refresh preserves the section) */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Child record sections">
        {TABS.map((t) => (
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

      {tab === 'profile' ? <ProfileTab studentId={studentId} onExpired={endSession} /> : null}
      {tab === 'attendance' ? <AttendanceTab studentId={studentId} onExpired={endSession} /> : null}
      {tab === 'results' ? <ResultsTab studentId={studentId} onExpired={endSession} /> : null}
      {tab === 'fees' ? <FeesTab studentId={studentId} onExpired={endSession} /> : null}
      {tab === 'announcements' ? <AnnouncementsTab onExpired={endSession} /> : null}
    </div>
  );
}

/** Shared loader wrapper for parent tabs. */
function useParentTab<T>(
  studentId: number,
  path: string,
  onExpired: (message: string) => void,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await parentGet<T>(path));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onExpired('Session expired — please search and verify again.');
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, path]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, loading, reload: load };
}

function ProfileTab({
  studentId,
  onExpired,
}: {
  studentId: number;
  onExpired: (m: string) => void;
}) {
  const { data, error, loading } = useParentTab<StudentProfile>(
    studentId,
    `/parent/students/${studentId}/profile`,
    onExpired,
  );

  if (loading) return <Spinner label="Loading profile…" />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  return (
    <Panel title="Student details">
      <dl className="divide-y divide-periwinkle/15">
        {[
          ['Roll number', <span className="font-mono text-violet">{data.roll_number}</span>],
          ['Branch', `${data.branch_name} (${data.branch_code})`],
          ['Class', data.class_section ?? '—'],
          ['Academic year', data.academic_year ?? '—'],
          ['Date of birth', dateShort(data.date_of_birth)],
          ['Gender', data.gender ?? '—'],
          ['Guardian', data.guardian_name ?? '—'],
        ].map(([label, value], i) => (
          <div key={i} className="py-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label as string}</dt>
            <dd className="mt-0.5 text-sm text-plum">{value as React.ReactNode}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-muted">
        This portal is read-only. Contact the college office to correct any detail.
      </p>
    </Panel>
  );
}

function AttendanceTab({
  studentId,
  onExpired,
}: {
  studentId: number;
  onExpired: (m: string) => void;
}) {
  const { data, error, loading } = useParentTab<AttendanceSummary>(
    studentId,
    `/parent/students/${studentId}/attendance`,
    onExpired,
  );
  const history = useParentTab<AttendanceHistoryEntry[]>(
    studentId,
    `/parent/students/${studentId}/attendance/history`,
    onExpired,
  );

  if (loading || history.loading) return <Spinner label="Loading attendance…" />;
  if (error || history.error) return <ErrorState error={error ?? history.error} />;
  if (!data) return null;

  const rows = history.data ?? [];
  const STATUS_STYLE: Record<string, string> = {
    present: 'bg-sage/15 text-sage',
    late: 'bg-periwinkle/25 text-violet',
    absent: 'bg-rose/15 text-rose',
    excused: 'bg-peach/50 text-plum',
    on_duty: 'bg-peach/50 text-plum',
  };

  return (
    <div className="space-y-5">
      <Panel title="Attendance (submitted sessions only)">
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
                {rows.map((r, i) => (
                  <tr key={`${r.attendance_date}-${r.subject_code ?? 'all'}-${i}`}>
                    <td className="py-2 pr-3 text-plum">{dateShort(r.attendance_date)}</td>
                    <td className="py-2 pr-3 text-muted">
                      {r.subject_code
                        ? `${r.subject_name ?? ''} (${r.subject_code})`.trim()
                        : '—'}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          STATUS_STYLE[r.status] ?? 'bg-periwinkle/20 text-plum'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-muted">{r.remarks ?? '—'}</td>
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

function ResultsTab({
  studentId,
  onExpired,
}: {
  studentId: number;
  onExpired: (m: string) => void;
}) {
  const { data, error, loading } = useParentTab<ResultSummary[]>(
    studentId,
    `/parent/students/${studentId}/results`,
    onExpired,
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

function FeesTab({
  studentId,
  onExpired,
}: {
  studentId: number;
  onExpired: (m: string) => void;
}) {
  // Summary from the parent-scoped endpoint; payment history + receipts from
  // the shared fees endpoint (same server-side scope check, read-only for
  // parents — can_record_payment is always false for this session).
  const summary = useParentTab<FeeSummary | null>(
    studentId,
    `/parent/students/${studentId}/fees`,
    onExpired,
  );
  const detail = useParentTab<StudentFeesOut>(
    studentId,
    `/fees/students/${studentId}`,
    onExpired,
  );

  if (summary.loading || detail.loading) return <Spinner label="Loading fees…" />;
  if (summary.error || detail.error) return <ErrorState error={summary.error ?? detail.error} />;

  const s = summary.data;
  const payments = detail.data?.payments ?? [];
  const obligations = detail.data?.obligations ?? [];

  return (
    <div className="space-y-5">
      <Panel title="Fee status">
        {s ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label="Total" value={inrExact(s.total_amount)} accent="periwinkle" />
            <KpiCard label="Paid" value={inrExact(s.paid_amount)} accent="sage" />
            <KpiCard label="Outstanding" value={inrExact(s.pending_amount)} accent="rose" />
            <KpiCard label="Status" value={s.status} hint={dateShort(s.due_date)} accent="violet" />
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
                {obligations.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2 pr-3 text-plum">{o.fee_structure_name}</td>
                    <td className="py-2 pr-3 text-right text-plum">{inrExact(o.total_amount)}</td>
                    <td className="py-2 pr-3 text-right text-plum">{inrExact(o.paid_amount)}</td>
                    <td className="py-2 pr-3 text-right text-plum">{inrExact(o.pending_amount)}</td>
                    <td className="py-2 text-xs text-muted">{o.status}</td>
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
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-3 font-mono text-xs text-violet">{p.receipt_number}</td>
                    <td className="py-2 pr-3 text-plum">{dateTime(p.paid_at)}</td>
                    <td className="py-2 pr-3 text-muted">{p.method}</td>
                    <td className="py-2 pr-3 text-right font-semibold text-plum">
                      {inrExact(p.amount)}
                    </td>
                    <td className="py-2 text-xs text-muted">{p.status}</td>
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

function AnnouncementsTab({ onExpired }: { onExpired: (m: string) => void }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AnnouncementPage | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Parents only see announcements addressed to parents or to everyone.
      setData(
        await parentGet<AnnouncementPage>('/announcements', {
          page,
          page_size: 6,
          audience: 'parents',
        }),
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onExpired('Session expired — please search and verify again.');
      } else {
        setError(err);
      }
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

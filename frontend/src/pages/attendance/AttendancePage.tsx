/**
 * Attendance workbench.
 *
 * Class options come from GET /meta/classes, which the SERVER scopes to the
 * caller (faculty → assigned classes, principal/admin → all). Using the
 * catalog (not just existing sessions) means a class with no sessions yet —
 * e.g. a CEC section, or a newly-assigned faculty's class — still appears and
 * can be opened for marking. Save (PUT) and Submit (POST) enforce their rules
 * server-side; this page renders affordances from permissions and always
 * re-reads after a write.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCheck, Send } from 'lucide-react';
import { get, post, put } from '@/shared/api/client';
import type {
  AttendanceStatus,
  ClassSectionOut,
  RosterStudent,
  SaveRecordsResponse,
  SessionDetail,
  SessionSummary,
  SubmitResponse,
} from '@/shared/api/types';
import { ErrorState, EmptyState, Spinner } from '@/components/ui/States';
import { Panel } from '@/components/ui/Panel';
import { useAuth } from '@/app/AuthContext';
import { ApiError } from '@/shared/api/client';
import { formatDate } from '@/components/ui/Panel';

const STATUS_OPTIONS: AttendanceStatus[] = ['present', 'absent', 'late'];

const STATUS_STYLE: Record<string, string> = {
  present: 'bg-sage/20 text-sage',
  absent: 'bg-rose/20 text-rose',
  late: 'bg-peach/70 text-violet-600',
  draft: 'bg-periwinkle/30 text-violet',
  not_started: 'bg-periwinkle/20 text-muted',
  submitted: 'bg-sage/20 text-sage',
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface EditValue {
  status: AttendanceStatus;
  remarks: string;
}

export default function AttendancePage(): JSX.Element {
  const { has } = useAuth();
  const canCorrect = has('attendance:correct');

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsError, setSessionsError] = useState<unknown>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [classes, setClasses] = useState<ClassSectionOut[]>([]);
  const [classId, setClassId] = useState<number | null>(null);
  const [date, setDate] = useState<string>(todayISO());
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [detailError, setDetailError] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [edits, setEdits] = useState<Record<number, EditValue>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const rows = await get<SessionSummary[]>('/attendance/sessions');
      setSessions(rows);
    } catch (err) {
      setSessionsError(err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  // Class catalog (server-scoped to this caller). Drives the dropdown so a
  // class with no sessions yet (e.g. CEC, or a brand-new assignment) is still
  // selectable and can be opened for marking.
  const loadClasses = useCallback(async () => {
    try {
      const rows = await get<ClassSectionOut[]>('/meta/classes');
      setClasses(rows);
      // Default to the first class the caller may act on.
      setClassId((current) => current ?? rows[0]?.id ?? null);
    } catch {
      setClasses([]);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
    void loadClasses();
  }, [loadSessions, loadClasses]);

  const classOptions = useMemo(
    () =>
      classes.map((c) => ({
        id: c.id,
        // Same "MPC-I-A" label the backend uses for session summaries.
        label: `${c.branch_code ?? ''}-${c.section_name}`.replace(/^-/, ''),
        branch: c.branch_code ?? '',
      })),
    [classes],
  );

  const loadDetail = useCallback(async () => {
    if (!classId) return;
    setDetailLoading(true);
    setDetailError(null);
    setActionError(null);
    setNotice(null);
    try {
      const result = await get<SessionDetail>('/attendance/roster', {
        class_id: classId,
        date,
      });
      setDetail(result);
      const initial: Record<number, EditValue> = {};
      for (const r of result.roster) {
        initial[r.student_id] = { status: (r.status ?? 'present') as AttendanceStatus, remarks: r.remarks ?? '' };
      }
      setEdits(initial);
    } catch (err) {
      setDetail(null);
      setDetailError(err);
    } finally {
      setDetailLoading(false);
    }
  }, [classId, date]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const submitted = detail?.status === 'submitted';
  const editable = !submitted || canCorrect;

  const setStudentStatus = (studentId: number, status: AttendanceStatus) => {
    setEdits((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? { status, remarks: '' }), status },
    }));
  };

  const markAllPresent = () => {
    if (!detail) return;
    const next: Record<number, EditValue> = {};
    for (const r of detail.roster) {
      next[r.student_id] = { status: 'present', remarks: edits[r.student_id]?.remarks ?? '' };
    }
    setEdits(next);
  };

  const save = async () => {
    if (!detail || !classId) return;
    setSaving(true);
    setActionError(null);
    setNotice(null);
    try {
      const body = {
        records: detail.roster.map((r) => ({
          student_id: r.student_id,
          status: edits[r.student_id]?.status ?? 'present',
          remarks: edits[r.student_id]?.remarks || null,
        })),
      };
      const res = await put<SaveRecordsResponse>(
        '/attendance/roster',
        body,
        { class_id: classId, date },
      );
      setNotice(`Saved — ${res.marked}/${res.roster_size} marked.`);
      await loadDetail();
    } catch (err) {
      setActionError(err);
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!classId) return;
    setSubmitting(true);
    setActionError(null);
    setNotice(null);
    try {
      const res = await post<SubmitResponse>(
        '/attendance/submit',
        undefined,
        { class_id: classId, date },
      );
      setNotice(`Submitted — ${res.marked}/${res.roster_size} marked.`);
      await loadDetail();
      await loadSessions();
    } catch (err) {
      setActionError(err);
    } finally {
      setSubmitting(false);
    }
  };

  // -- loading / error states -------------------------------------------------
  if (sessionsLoading) return <Spinner label="Loading your classes…" />;
  if (sessionsError) return <ErrorState error={sessionsError} onRetry={() => void loadSessions()} />;
  if (classOptions.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-plum">Attendance</h2>
        <EmptyState
          title="No classes available"
          hint="Your assignments do not include any class sections yet. Contact the administrator."
        />
      </div>
    );
  }

  const marked = detail ? detail.roster.filter((r) => r.status != null).length : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-plum">Attendance</h2>
          <p className="text-sm text-muted">Mark, save, and submit daily attendance</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="att-class" className="mb-1 block text-xs font-medium text-muted">
              Class
            </label>
            <select
              id="att-class"
              className="surface rounded-xl px-3 py-2 text-sm text-plum"
              value={classId ?? ''}
              onChange={(e) => setClassId(Number(e.target.value))}
            >
              {classOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} ({c.branch})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="att-date" className="mb-1 block text-xs font-medium text-muted">
              Date
            </label>
            <input
              id="att-date"
              type="date"
              max={todayISO()}
              className="surface rounded-xl px-3 py-2 text-sm text-plum"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {detailLoading ? (
        <Spinner label="Loading roster…" />
      ) : detailError ? (
        <ErrorState error={detailError} onRetry={() => void loadDetail()} />
      ) : detail ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[detail.status] ?? STATUS_STYLE.not_started}`}
            >
              {detail.status.replace('_', ' ')}
            </span>
            <span className="text-sm text-muted">
              {detail.class_label} · {formatDate(detail.attendance_date)} · {marked}/
              {detail.roster.length} marked
              {detail.subject ? ` · ${detail.subject}` : ''}
            </span>
            {detail.submitted_at ? (
              <span className="text-xs text-muted">submitted {formatDate(detail.submitted_at)}</span>
            ) : null}
          </div>

          {actionError ? (
            <div className="rounded-xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-plum" role="alert">
              {actionError instanceof ApiError
                ? `${actionError.message} (${actionError.code})`
                : 'Action failed.'}
            </div>
          ) : null}
          {notice ? (
            <div className="rounded-xl border border-sage/40 bg-sage/10 px-4 py-3 text-sm text-plum" role="status">
              {notice}
            </div>
          ) : null}

          <Panel>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted">
                {submitted && !canCorrect
                  ? 'Submitted sessions are read-only. Principals with correction rights may edit.'
                  : 'Select a status for every student, then save and submit.'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={!editable}
                  onClick={markAllPresent}
                >
                  <CheckCheck className="h-4 w-4" />
                  All present
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={!editable || saving}
                  onClick={() => void save()}
                >
                  {saving ? 'Saving…' : 'Save draft'}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!editable || submitted || submitting}
                  onClick={() => void submit()}
                >
                  <Send className="h-4 w-4" />
                  {submitting ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-periwinkle/30 text-xs uppercase tracking-wide text-muted">
                    <th className="pb-2 pr-4 font-medium">Roll no.</th>
                    <th className="pb-2 pr-4 font-medium">Student</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-periwinkle/20">
                  {detail.roster.map((r: RosterStudent) => {
                    const value = edits[r.student_id] ?? { status: 'present' as AttendanceStatus, remarks: '' };
                    return (
                      <tr key={r.student_id}>
                        <td className="py-2 pr-4 font-mono text-xs text-violet">{r.roll_number}</td>
                        <td className="py-2 pr-4 text-plum">{r.full_name}</td>
                        <td className="py-2 pr-4">
                          <div className="flex gap-1.5" role="radiogroup" aria-label={`Status for ${r.full_name}`}>
                            {STATUS_OPTIONS.map((s) => (
                              <button
                                key={s}
                                type="button"
                                role="radio"
                                aria-checked={value.status === s}
                                disabled={!editable}
                                onClick={() => setStudentStatus(r.student_id, s)}
                                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                                  value.status === s
                                    ? STATUS_STYLE[s]
                                    : 'bg-white/70 text-muted hover:bg-white'
                                } disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-2">
                          <input
                            className="surface w-full rounded-lg px-2 py-1 text-xs text-plum placeholder:text-muted disabled:opacity-60"
                            placeholder="Optional remark"
                            disabled={!editable}
                            value={value.remarks}
                            onChange={(e) =>
                              setEdits((prev) => ({
                                ...prev,
                                [r.student_id]: { ...value, remarks: e.target.value },
                              }))
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Recent sessions list (scoped by the server) */}
          <Panel title="Recent sessions">
            {sessions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">No sessions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-periwinkle/30 text-xs uppercase tracking-wide text-muted">
                      <th className="pb-2 pr-3 font-medium">Date</th>
                      <th className="pb-2 pr-3 font-medium">Class</th>
                      <th className="pb-2 pr-3 font-medium">Branch</th>
                      <th className="pb-2 pr-3 font-medium">Status</th>
                      <th className="pb-2 text-right font-medium">Marked</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-periwinkle/20">
                    {sessions.slice(0, 8).map((s) => (
                      <tr
                        key={`${s.class_section_id}-${s.attendance_date}`}
                        className="cursor-pointer hover:bg-white/60"
                        onClick={() => {
                          setClassId(s.class_section_id);
                          setDate(s.attendance_date);
                        }}
                      >
                        <td className="py-2 pr-3 text-plum">{s.attendance_date}</td>
                        <td className="py-2 pr-3 text-plum">{s.class_label}</td>
                        <td className="py-2 pr-3 text-muted">{s.branch_code}</td>
                        <td className="py-2 pr-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[s.status] ?? ''}`}>
                            {s.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2 text-right text-muted">
                          {s.marked}/{s.roster_size}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      ) : null}
    </div>
  );
}

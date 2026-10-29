/**
 * Results workspace: exams list + marks entry + publish/reopen lifecycle.
 *
 * - `results:write` (faculty) edits marks while the exam is editable
 * - `results:publish` (principal) publishes/reopens — publish is the only way
 *   results become visible to parents/students
 * - opens directly when linked from the faculty dashboard (?exam=ID)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Eye, EyeOff, Plus, RotateCcw, Save } from 'lucide-react';
import { ApiError, get, post, put } from '@/shared/api/client';
import type {
  ClassSectionOut,
  ExaminationDetail,
  ExaminationOut,
  SaveResultsResponse,
  SubjectOut,
} from '@/shared/api/types';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/States';
import { Panel } from '@/components/ui/Panel';
import { useAuth } from '@/app/AuthContext';
import { dateShort } from '@/shared/lib/format';

const EXAM_TYPES = ['unit_test', 'monthly_test', 'midterm', 'final', 'practical'] as const;

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-periwinkle/20 text-muted',
  entered: 'bg-peach/70 text-violet-600',
  published: 'bg-sage/20 text-sage',
};

export default function ResultsPage(): JSX.Element {
  const { has } = useAuth();
  const canRead = has('results:read');
  const canWrite = has('results:write');
  const canPublish = has('results:publish');

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('exam');

  const [exams, setExams] = useState<ExaminationOut[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [examsError, setExamsError] = useState<unknown>(null);
  const [examsLoading, setExamsLoading] = useState(true);

  const [detail, setDetail] = useState<ExaminationDetail | null>(null);
  const [detailError, setDetailError] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [edits, setEdits] = useState<
    Record<number, { marks: string; is_absent: boolean; remarks: string }>
  >({});
  const [busy, setBusy] = useState(false);
  // Synchronous re-entrancy guard: `busy` state updates are async, so two
  // clicks in the same tick would both see busy === false. The ref flips
  // immediately, so a double-click can never fire two Save/Publish requests.
  const busyRef = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadExams = useCallback(async () => {
    setExamsLoading(true);
    setExamsError(null);
    try {
      const rows = await get<ExaminationOut[]>('/examinations', {
        status: statusFilter || undefined,
      });
      setExams(rows);
    } catch (err) {
      setExamsError(err);
    } finally {
      setExamsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  const loadDetail = useCallback(async () => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    setActionError(null);
    setNotice(null);
    try {
      const result = await get<ExaminationDetail>(`/examinations/${selectedId}`);
      setDetail(result);
      const initial: Record<number, { marks: string; is_absent: boolean; remarks: string }> = {};
      for (const r of result.roster) {
        initial[r.student_id] = {
          marks: r.marks_obtained ?? '',
          is_absent: r.is_absent,
          remarks: r.remarks ?? '',
        };
      }
      setEdits(initial);
    } catch (err) {
      setDetail(null);
      setDetailError(err);
    } finally {
      setDetailLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const select = (id: number) => {
    setSearchParams({ exam: String(id) });
  };

  const canEdit = Boolean(detail?.can_edit) && canWrite;

  const save = async () => {
    if (!detail || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      // Client-side validation (the server re-checks everything): marks must
      // be numeric, non-negative and within the exam's maximum.
      const max = Number(detail.examination.max_marks);
      const rows = detail.roster.map((r) => {
        const e = edits[r.student_id] ?? { marks: '', is_absent: false, remarks: '' };
        let marks: number | null = null;
        if (!e.is_absent && e.marks !== '') {
          marks = Number(e.marks);
          if (!Number.isFinite(marks)) {
            throw new Error(`Marks for ${r.roll_number} must be a number.`);
          }
          if (marks < 0) {
            throw new Error(`Marks for ${r.roll_number} cannot be negative.`);
          }
          if (marks > max) {
            throw new Error(
              `Marks for ${r.roll_number} exceed the maximum (${max}).`,
            );
          }
        }
        return {
          student_id: r.student_id,
          marks_obtained: marks,
          is_absent: e.is_absent,
          remarks: e.remarks.trim() || null,
        };
      });
      const res = await put<SaveResultsResponse>(
        `/examinations/${detail.examination.id}/results`,
        { results: rows },
      );
      setNotice(`Saved ${res.saved} result${res.saved === 1 ? '' : 's'} (${res.entered}/${res.expected} entered).`);
      await loadDetail();
      await loadExams();
    } catch (err) {
      // Entered marks are preserved: `edits` is untouched on failure.
      setActionError(err instanceof ApiError ? `${err.message} (${err.code})` : err instanceof Error ? err.message : 'Saving failed.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!detail || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      await post(`/examinations/${detail.examination.id}/publish`);
      setNotice('Published — results are now visible to parents and students.');
      await loadDetail();
      await loadExams();
    } catch (err) {
      setActionError(err instanceof ApiError ? `${err.message} (${err.code})` : 'Publish failed.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const reopen = async () => {
    if (!detail || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      await post(`/examinations/${detail.examination.id}/reopen`);
      setNotice('Reopened — results are hidden again until republished.');
      await loadDetail();
      await loadExams();
    } catch (err) {
      setActionError(err instanceof ApiError ? `${err.message} (${err.code})` : 'Reopen failed.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const examRows = useMemo(() => exams, [exams]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-plum">Examinations &amp; results</h2>
          <p className="text-sm text-muted">
            Enter marks, publish when ready — parents only see published results
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label htmlFor="exam-status" className="mb-1 block text-xs font-medium text-muted">
              Status
            </label>
            <select
              id="exam-status"
              className="surface rounded-xl px-3 py-2 text-sm text-plum"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="entered">Entered</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
      </div>

      {canWrite || canPublish ? <CreateExamForm onCreated={() => void loadExams()} /> : null}

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Exams list */}
        <div className="lg:col-span-2">
          <Panel title={`Exams (${examRows.length})`}>
            {examsLoading ? (
              <Spinner label="Loading exams…" />
            ) : examsError ? (
              <ErrorState error={examsError} onRetry={() => void loadExams()} />
            ) : examRows.length === 0 ? (
              <EmptyState title="No examinations" hint="Create one, or change the status filter." />
            ) : (
              <ul className="divide-y divide-periwinkle/20">
                {examRows.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      className={`w-full rounded-xl px-3 py-2.5 text-left transition hover:bg-white/70 ${
                        String(e.id) === selectedId ? 'bg-white/90 shadow-sm ring-1 ring-periwinkle/40' : ''
                      }`}
                      onClick={() => select(e.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-plum">{e.title}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[e.status] ?? ''}`}
                        >
                          {e.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {e.class_label} · {e.subject_code} · {e.entered}/{e.expected} entered
                        {e.exam_date ? ` · ${dateShort(e.exam_date)}` : ''}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Detail / entry */}
        <div className="lg:col-span-3">
          {!selectedId ? (
            <Panel>
              <div className="py-12 text-center text-sm text-muted">
                Select an exam to view or enter results.
              </div>
            </Panel>
          ) : detailLoading ? (
            <Spinner label="Loading exam…" />
          ) : detailError ? (
            <ErrorState error={detailError} onRetry={() => void loadDetail()} />
          ) : detail ? (
            <Panel>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-plum">{detail.examination.title}</h3>
                  <p className="text-sm text-muted">
                    {detail.examination.class_label} · {detail.examination.subject_name} (
                    {detail.examination.subject_code}) · max {detail.examination.max_marks} · pass{' '}
                    {detail.examination.pass_marks} ·{' '}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[detail.examination.status] ?? ''}`}
                    >
                      {detail.examination.status}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canEdit ? (
                    <button type="button" className="btn-ghost" disabled={busy} onClick={() => void save()}>
                      <Save className="h-4 w-4" />
                      {busy ? 'Working…' : 'Save results'}
                    </button>
                  ) : null}
                  {canPublish && detail.examination.status !== 'published' ? (
                    <button type="button" className="btn-primary" disabled={busy} onClick={() => void publish()}>
                      <Eye className="h-4 w-4" />
                      Publish
                    </button>
                  ) : null}
                  {canPublish && detail.examination.status === 'published' ? (
                    <button type="button" className="btn-ghost" disabled={busy} onClick={() => void reopen()}>
                      <RotateCcw className="h-4 w-4" />
                      Reopen (hide)
                    </button>
                  ) : null}
                </div>
              </div>

              {actionError ? (
                <p className="mb-3 rounded-xl border border-rose/40 bg-rose/10 px-3 py-2 text-sm text-plum" role="alert">
                  {actionError}
                </p>
              ) : null}
              {notice ? (
                <p className="mb-3 rounded-xl border border-sage/40 bg-sage/10 px-3 py-2 text-sm text-plum" role="status">
                  {notice}
                </p>
              ) : null}

              {detail.examination.status === 'published' && canRead ? (
                <p className="mb-3 flex items-center gap-2 rounded-xl bg-sage/10 px-3 py-2 text-sm text-plum">
                  <CheckCircle2 className="h-4 w-4 text-sage" aria-hidden />
                  Published — visible to parents and students.
                </p>
              ) : (
                <p className="mb-3 flex items-center gap-2 rounded-xl bg-peach/50 px-3 py-2 text-sm text-plum">
                  <EyeOff className="h-4 w-4 text-violet" aria-hidden />
                  Not published — hidden from parents and students.
                </p>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-periwinkle/30 text-xs uppercase tracking-wide text-muted">
                      <th className="pb-2 pr-3 font-medium">Roll</th>
                      <th className="pb-2 pr-3 font-medium">Student</th>
                      <th className="pb-2 pr-3 font-medium">Marks / {detail.examination.max_marks}</th>
                      <th className="pb-2 pr-3 font-medium">Absent</th>
                      <th className="pb-2 font-medium">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-periwinkle/20">
                    {detail.roster.map((r) => {
                      const value = edits[r.student_id] ?? { marks: '', is_absent: false, remarks: '' };
                      return (
                        <tr key={r.student_id}>
                          <td className="py-2 pr-3 font-mono text-xs text-violet">{r.roll_number}</td>
                          <td className="py-2 pr-3 text-plum">{r.full_name}</td>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              min={0}
                              max={Number(detail.examination.max_marks)}
                              step="0.5"
                              className="surface w-24 rounded-lg px-2 py-1 text-sm text-plum disabled:opacity-60"
                              value={value.is_absent ? '' : value.marks}
                              disabled={!canEdit || value.is_absent}
                              aria-label={`Marks for ${r.full_name}`}
                              onChange={(e) =>
                                setEdits((prev) => ({
                                  ...prev,
                                  [r.student_id]: { ...value, marks: e.target.value },
                                }))
                              }
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[#7960ad]"
                              checked={value.is_absent}
                              disabled={!canEdit}
                              aria-label={`Absent for ${r.full_name}`}
                              onChange={(e) =>
                                setEdits((prev) => ({
                                  ...prev,
                                  [r.student_id]: { ...value, is_absent: e.target.checked },
                                }))
                              }
                            />
                          </td>
                          <td className="py-2">
                            <input
                              className="surface w-full rounded-lg px-2 py-1 text-xs text-plum placeholder:text-muted disabled:opacity-60"
                              placeholder="Optional"
                              disabled={!canEdit}
                              value={value.remarks}
                              aria-label={`Remarks for ${r.full_name}`}
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
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Create exam                                                                 */
/* -------------------------------------------------------------------------- */

function CreateExamForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState<ClassSectionOut[]>([]);
  const [subjects, setSubjects] = useState<SubjectOut[]>([]);
  const [classId, setClassId] = useState<number | ''>('');
  const [branchId, setBranchId] = useState<number | ''>('');
  const [subjectId, setSubjectId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [examType, setExamType] = useState<string>('unit_test');
  const [examDate, setExamDate] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');
  const [passMarks, setPassMarks] = useState('35');
  const [busy, setBusy] = useState(false);
  // Synchronous re-entrancy guard: React state updates are async, so two
  // clicks in the same tick would both see busy === false. The ref flips
  // immediately, so a double-click can never fire two POSTs.
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const openForm = async () => {
    setOpen(true);
    if (classes.length === 0) {
      try {
        const cls = await get<ClassSectionOut[]>('/meta/classes');
        setClasses(cls);
        if (cls.length > 0) {
          setClassId(cls[0].id);
          setBranchId(cls[0].branch_id);
        }
      } catch {
        setError('Could not load classes.');
      }
    }
  };

  useEffect(() => {
    if (branchId === '') return;
    void get<SubjectOut[]>('/meta/subjects', { branch_id: branchId })
      .then((rows) => {
        setSubjects(rows);
        setSubjectId('');
      })
      .catch(() => setSubjects([]));
  }, [branchId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (classId === '' || subjectId === '' || busyRef.current) return;
    // Client-side sanity check (server re-validates): pass marks ≤ max marks.
    const max = Number(maxMarks);
    const pass = Number(passMarks);
    if (!Number.isFinite(max) || max <= 0) {
      setError('Max marks must be a positive number.');
      return;
    }
    if (!Number.isFinite(pass) || pass < 0 || pass > max) {
      setError('Pass marks must be between 0 and the max marks.');
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const exam = await post<ExaminationOut>('/examinations', {
        title: title.trim(),
        class_section_id: classId,
        subject_id: subjectId,
        exam_type: examType,
        exam_date: examDate || null,
        max_marks: maxMarks,
        pass_marks: passMarks,
      });
      setCreated(exam.title);
      setTitle('');
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? `${err.message} (${err.code})` : 'Could not create exam.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn-ghost" onClick={() => void openForm()}>
        <Plus className="h-4 w-4" />
        New examination
      </button>
    );
  }

  return (
    <Panel title="New examination">
      <form className="grid gap-3 md:grid-cols-3" onSubmit={submit}>
        <div className="md:col-span-2">
          <label htmlFor="ex-title" className="mb-1 block text-xs font-medium text-muted">
            Title
          </label>
          <input
            id="ex-title"
            className="surface w-full rounded-xl px-3 py-2 text-sm text-plum"
            placeholder="Unit Test 2 — Integrals"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="ex-type" className="mb-1 block text-xs font-medium text-muted">
            Type
          </label>
          <select
            id="ex-type"
            className="surface w-full rounded-xl px-3 py-2 text-sm text-plum"
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
          >
            {EXAM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ex-class" className="mb-1 block text-xs font-medium text-muted">
            Class
          </label>
          <select
            id="ex-class"
            className="surface w-full rounded-xl px-3 py-2 text-sm text-plum"
            value={classId}
            onChange={(e) => {
              const id = Number(e.target.value);
              setClassId(id);
              const cls = classes.find((c) => c.id === id);
              if (cls) setBranchId(cls.branch_id);
            }}
            required
          >
            <option value="" disabled>
              Select class
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.branch_code ?? ''}-{c.section_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ex-subject" className="mb-1 block text-xs font-medium text-muted">
            Subject
          </label>
          <select
            id="ex-subject"
            className="surface w-full rounded-xl px-3 py-2 text-sm text-plum"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : '')}
            required
          >
            <option value="" disabled>
              Select subject
            </option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ex-date" className="mb-1 block text-xs font-medium text-muted">
            Date
          </label>
          <input
            id="ex-date"
            type="date"
            className="surface w-full rounded-xl px-3 py-2 text-sm text-plum"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="ex-max" className="mb-1 block text-xs font-medium text-muted">
            Max marks
          </label>
          <input
            id="ex-max"
            type="number"
            min="1"
            className="surface w-full rounded-xl px-3 py-2 text-sm text-plum"
            value={maxMarks}
            onChange={(e) => setMaxMarks(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="ex-pass" className="mb-1 block text-xs font-medium text-muted">
            Pass marks
          </label>
          <input
            id="ex-pass"
            type="number"
            min="0"
            className="surface w-full rounded-xl px-3 py-2 text-sm text-plum"
            value={passMarks}
            onChange={(e) => setPassMarks(e.target.value)}
            required
          />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn-primary" disabled={busy}>
            <ClipboardList className="h-4 w-4" />
            {busy ? 'Creating…' : 'Create'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
        {error ? (
          <p className="md:col-span-3 rounded-xl border border-rose/40 bg-rose/10 px-3 py-2 text-sm text-plum" role="alert">
            {error}
          </p>
        ) : null}
        {created ? (
          <p className="md:col-span-3 rounded-xl border border-sage/40 bg-sage/10 px-3 py-2 text-sm text-plum" role="status">
            Created “{created}”.
          </p>
        ) : null}
      </form>
    </Panel>
  );
}

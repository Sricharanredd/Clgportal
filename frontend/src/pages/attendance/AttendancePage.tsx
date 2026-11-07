/**
 * Attendance workbench.
 *
 * Class options come from GET /meta/classes, which the SERVER scopes to the
 * caller (faculty → assigned classes, principal/admin → all). Using the
 * catalog (not just existing sessions) means a class with no sessions yet —
 * e.g. a CEC section, or a newly-assigned faculty's class — still appears and
 * can be opened for marking. Submit carries the marks WITH the request (no
 * prior draft required); Save (PUT) and Submit (POST) both enforce their
 * rules server-side; this page renders affordances from permissions and
 * always re-reads after a write.
 *
 * UX: the selected class + date live in the URL (?class_id=&date=) so the
 * dashboard's "Mark attendance" link opens the exact roster, and a refresh or
 * bookmark keeps working. Marks use segmented toggles with a live counter and
 * a sticky save bar; submit asks for confirmation and success is announced
 * with a toast.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarCheck2,
  CheckCheck,
  ChevronRight,
  History,
  Save,
  Send,
  Users,
} from 'lucide-react';
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
import { ApiError } from '@/shared/api/client';
import { useAuth } from '@/app/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { dateLong, dayLabel, todayLong } from '@/shared/lib/format';

const STATUS_ORDER: AttendanceStatus[] = ['present', 'late', 'absent'];

const STATUS_META: Record<AttendanceStatus, { label: string; active: string }> = {
  present: { label: 'Present', active: 'bg-success text-white shadow-xs' },
  late: { label: 'Late', active: 'bg-warning text-white shadow-xs' },
  absent: { label: 'Absent', active: 'bg-danger text-white shadow-xs' },
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface EditValue {
  status: AttendanceStatus;
  remarks: string;
}

/** Segmented Present / Late / Absent control (radio semantics). */
function StatusToggle({
  value,
  onChange,
  name,
  disabled,
  className = '',
}: {
  value: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
  name: string;
  disabled: boolean;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={`Attendance status for ${name}`}
      className={`inline-flex rounded-control border border-line bg-surface-2 p-0.5 ${className}`}
    >
      {STATUS_ORDER.map((status) => {
        const active = value === status;
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(status)}
            className={`flex-1 rounded-[6px] px-2.5 py-1 text-[11.5px] font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
              active
                ? STATUS_META[status].active
                : 'text-muted hover:bg-surface hover:text-ink'
            }`}
          >
            {STATUS_META[status].label}
          </button>
        );
      })}
    </div>
  );
}

function RosterSkeleton() {
  return (
    <div className="card p-5" aria-busy="true">
      <span className="sr-only">Loading roster…</span>
      <SkeletonRows rows={6} />
    </div>
  );
}

export default function AttendancePage(): JSX.Element {
  const { has } = useAuth();
  const canCorrect = has('attendance:correct');
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const classParam = params.get('class_id');
  const dateParam = params.get('date');

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsError, setSessionsError] = useState<unknown>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [classes, setClasses] = useState<ClassSectionOut[]>([]);
  const [classId, setClassId] = useState<number | null>(() => {
    const parsed = Number(classParam);
    return classParam && Number.isFinite(parsed) ? parsed : null;
  });
  const [date, setDate] = useState<string>(() =>
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayISO(),
  );
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [detailError, setDetailError] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [edits, setEdits] = useState<Record<number, EditValue>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
      // Keep a deep-linked class if it is in scope, otherwise default to the first.
      setClassId((current) => current ?? rows[0]?.id ?? null);
    } catch {
      setClasses([]);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
    void loadClasses();
  }, [loadSessions, loadClasses]);

  // Keep the URL in step with the selected class/date (deep links + refresh).
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (classId) next.set('class_id', String(classId));
    else next.delete('class_id');
    if (date) next.set('date', date);
    else next.delete('date');
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [classId, date, params, setParams]);

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
    try {
      const result = await get<SessionDetail>('/attendance/roster', {
        class_id: classId,
        date,
      });
      setDetail(result);
      const initial: Record<number, EditValue> = {};
      for (const r of result.roster) {
        initial[r.student_id] = {
          status: (r.status ?? 'present') as AttendanceStatus,
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

  const setStudentRemarks = (studentId: number, remarks: string) => {
    setEdits((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? { status: 'present', remarks: '' }), remarks },
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

  // The complete marks payload — shared by Save draft and Submit so a draft
  // is never required before submitting (the server upserts either way).
  const buildRecords = (target: SessionDetail) =>
    target.roster.map((r) => ({
      student_id: r.student_id,
      status: edits[r.student_id]?.status ?? 'present',
      remarks: edits[r.student_id]?.remarks || null,
    }));

  const save = async () => {
    if (!detail || !classId) return;
    setSaving(true);
    try {
      const body = { records: buildRecords(detail) };
      const res = await put<SaveRecordsResponse>('/attendance/roster', body, {
        class_id: classId,
        date,
      });
      toast.success(
        'Draft saved',
        `${res.marked} of ${res.roster_size} students marked for ${detail.class_label}.`,
      );
      await loadDetail();
    } catch (err) {
      toast.error(
        'Could not save the draft',
        err instanceof ApiError ? err.message : 'Check your connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!detail || !classId) return;
    setSubmitting(true);
    try {
      // The marks travel WITH the submit: the server validates scope,
      // completeness and enrolment, saves, and finalizes in one request.
      const res = await post<SubmitResponse>(
        '/attendance/submit',
        { records: buildRecords(detail) },
        { class_id: classId, date },
      );
      toast.success(
        'Attendance submitted',
        `${res.marked} of ${res.roster_size} students marked for ${detail.class_label}.`,
      );
      setConfirmOpen(false);
      await loadDetail();
      await loadSessions();
    } catch (err) {
      toast.error(
        'Could not submit attendance',
        err instanceof ApiError ? err.message : 'Check your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const counts = useMemo(() => {
    const result = { present: 0, late: 0, absent: 0 };
    for (const student of detail?.roster ?? []) {
      const status = edits[student.student_id]?.status;
      if (status === 'present') result.present += 1;
      else if (status === 'late') result.late += 1;
      else if (status === 'absent') result.absent += 1;
    }
    return result;
  }, [detail, edits]);

  const selectedClass = classOptions.find((option) => option.id === classId);

  // -- loading / error states -------------------------------------------------
  if (sessionsLoading) {
    return (
      <div className="space-y-5" role="status" aria-live="polite">
        <span className="sr-only">Loading attendance…</span>
        <div className="space-y-2">
          <span className="skeleton block h-3 w-24" />
          <span className="skeleton block h-7 w-64" />
          <span className="skeleton block h-3 w-80" />
        </div>
        <div className="card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <span className="skeleton block h-10 w-full" />
            <span className="skeleton block h-10 w-full" />
          </div>
        </div>
        <RosterSkeleton />
      </div>
    );
  }
  if (sessionsError) return <ErrorState error={sessionsError} onRetry={() => void loadSessions()} />;
  if (classOptions.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Academics"
          title="Attendance"
          description="Mark, save, and submit daily attendance."
        />
        <EmptyState
          title="No classes available"
          description="Your assignments do not include any class sections yet. Contact the administrator to be assigned a class."
          icon={<Users className="h-5 w-5" aria-hidden />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Academics"
        title="Attendance"
        description="Mark a full class in one pass, save a draft, or submit straight away — every change is re-read from the server."
        meta={
          <>
            <span>{todayLong()}</span>
            <span aria-hidden>·</span>
            <span>
              {selectedClass ? selectedClass.label : 'Select a class'}
              {detail ? ` · ${detail.roster.length} students` : ''}
            </span>
          </>
        }
      />

      {/* ── Class + date ─────────────────────────────────────────────── */}
      <Card>
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <Field label="Class" htmlFor="att-class">
            <Select
              id="att-class"
              value={classId ?? ''}
              onChange={(event) => setClassId(Number(event.target.value))}
            >
              {classOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} ({option.branch})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date" htmlFor="att-date" hint="Future dates cannot be marked.">
            <Input
              id="att-date"
              type="date"
              max={todayISO()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Button
            variant="secondary"
            icon={<CalendarCheck2 className="h-4 w-4" />}
            onClick={() => setDate(todayISO())}
            className="lg:mb-[1.375rem]"
          >
            Today
          </Button>
        </CardBody>
      </Card>

      {detailLoading || (!detail && !detailError) ? (
        <RosterSkeleton />
      ) : detailError ? (
        <ErrorState error={detailError} onRetry={() => void loadDetail()} title="Could not load this roster" />
      ) : detail ? (
        <>
          {/* ── Session summary ─────────────────────────────────────── */}
          <Card>
            <CardHeader
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {detail.class_label}
                  <StatusBadge status={detail.status} dot />
                </span>
              }
              description={
                <>
                  {dateLong(detail.attendance_date)}
                  {detail.subject ? ` · ${detail.subject}` : ''}
                  {detail.submitted_at ? ` · submitted ${dateLong(detail.submitted_at)}` : ''}
                </>
              }
              icon={<CalendarCheck2 className="h-4 w-4" />}
              actions={
                <Badge tone="neutral">
                  {detail.roster.length} student{detail.roster.length === 1 ? '' : 's'}
                </Badge>
              }
            />
            <CardBody className="space-y-3">
              {submitted && !canCorrect ? (
                <p className="flex items-start gap-2 rounded-panel border border-line bg-surface-2/70 px-3 py-2.5 text-[12.5px] leading-5 text-muted">
                  <History className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  This session has been submitted and is read-only. Principals with correction rights may
                  still edit it.
                </p>
              ) : (
                <p className="text-[12.5px] text-muted">
                  Choose a status for each student, then save a draft or submit the whole class.
                </p>
              )}

              {detail.roster.length === 0 ? (
                <EmptyState
                  title="No students in this class"
                  description="Once students are enrolled in this section they will appear here for marking."
                  icon={<Users className="h-5 w-5" aria-hidden />}
                  compact
                />
              ) : (
                <>
                  {/* Desktop roster */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full border-collapse text-left text-sm">
                      <caption className="sr-only">
                        Attendance roster for {detail.class_label} on {dateLong(detail.attendance_date)}
                      </caption>
                      <thead>
                        <tr className="border-b border-line bg-surface-2/60">
                          <th
                            scope="col"
                            className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-muted"
                          >
                            Student
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-muted"
                          >
                            Status
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-muted"
                          >
                            Remarks
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {detail.roster.map((r: RosterStudent) => {
                          const value = edits[r.student_id] ?? {
                            status: 'present' as AttendanceStatus,
                            remarks: '',
                          };
                          return (
                            <tr key={r.student_id} className="transition-colors hover:bg-surface-2/50">
                              <td className="px-3 py-2.5">
                                <p className="text-[13.5px] font-semibold text-ink">{r.full_name}</p>
                                <p className="font-mono text-[11px] text-muted">{r.roll_number}</p>
                              </td>
                              <td className="px-3 py-2.5">
                                <StatusToggle
                                  name={r.full_name}
                                  value={value.status}
                                  disabled={!editable}
                                  onChange={(status) => setStudentStatus(r.student_id, status)}
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <Input
                                  aria-label={`Remarks for ${r.full_name}`}
                                  placeholder="Optional remark"
                                  disabled={!editable}
                                  value={value.remarks}
                                  onChange={(event) => setStudentRemarks(r.student_id, event.target.value)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile roster */}
                  <ul className="space-y-2.5 md:hidden">
                    {detail.roster.map((r: RosterStudent) => {
                      const value = edits[r.student_id] ?? {
                        status: 'present' as AttendanceStatus,
                        remarks: '',
                      };
                      return (
                        <li key={r.student_id} className="rounded-panel border border-line bg-surface p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-[13.5px] font-semibold text-ink">{r.full_name}</p>
                              <p className="font-mono text-[11px] text-muted">{r.roll_number}</p>
                            </div>
                          </div>
                          <StatusToggle
                            name={r.full_name}
                            value={value.status}
                            disabled={!editable}
                            onChange={(status) => setStudentStatus(r.student_id, status)}
                            className="mt-2.5 flex w-full"
                          />
                          <Input
                            aria-label={`Remarks for ${r.full_name}`}
                            placeholder="Optional remark"
                            disabled={!editable}
                            value={value.remarks}
                            onChange={(event) => setStudentRemarks(r.student_id, event.target.value)}
                            className="mt-2"
                          />
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </CardBody>
          </Card>

          {/* ── Sticky action bar ───────────────────────────────────── */}
          {detail.roster.length > 0 ? (
            <div className="sticky bottom-3 z-20 rounded-card border border-line bg-surface/95 p-3 shadow-lift backdrop-blur-glass">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="success" dot>
                    Present {counts.present}
                  </Badge>
                  <Badge tone="warning" dot>
                    Late {counts.late}
                  </Badge>
                  <Badge tone="danger" dot>
                    Absent {counts.absent}
                  </Badge>
                  <span className="ml-1 text-[11.5px] text-muted">
                    {detail.roster.length} students · {counts.present + counts.late + counts.absent} counted
                  </span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    variant="secondary"
                    icon={<CheckCheck className="h-4 w-4" />}
                    disabled={!editable}
                    onClick={markAllPresent}
                  >
                    Mark all present
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<Save className="h-4 w-4" />}
                    loading={saving}
                    disabled={!editable}
                    onClick={() => void save()}
                  >
                    Save draft
                  </Button>
                  <Button
                    icon={<Send className="h-4 w-4" />}
                    loading={submitting}
                    disabled={!editable || submitted}
                    onClick={() => setConfirmOpen(true)}
                  >
                    Submit attendance
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Recent sessions ─────────────────────────────────────── */}
          <Card>
            <CardHeader
              title="Recent sessions"
              description="Open any session to review or correct it."
              icon={<History className="h-4 w-4" />}
              actions={<Badge tone="neutral">{sessions.length} total</Badge>}
            />
            <CardBody className="p-0">
              {sessions.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    title="No sessions yet"
                    description="Submitted and draft sessions will appear here."
                    icon={<CalendarCheck2 className="h-5 w-5" aria-hidden />}
                    compact
                  />
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {sessions.slice(0, 8).map((session) => (
                    <li key={`${session.class_section_id}-${session.attendance_date}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setClassId(session.class_section_id);
                          setDate(session.attendance_date);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/70 sm:px-5"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-panel bg-brand-50 text-brand-600">
                          <CalendarCheck2 className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[13px] font-bold text-ink">{session.class_label}</span>
                            <StatusBadge status={session.status} />
                          </span>
                          <span className="mt-0.5 block text-[11.5px] text-muted">
                            {dayLabel(session.attendance_date)}
                            {session.subject ? ` · ${session.subject}` : ''} · {session.branch_code}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-[11.5px] font-semibold text-ink-soft">
                            {session.marked}/{session.roster_size}
                          </span>
                          <span className="block text-[10.5px] text-muted">marked</span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-line-strong" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <ConfirmDialog
            open={confirmOpen}
            title="Submit attendance?"
            description={
              <>
                You are about to submit attendance for{' '}
                <strong className="font-bold text-ink">{detail.class_label}</strong> on{' '}
                <strong className="font-bold text-ink">{dateLong(detail.attendance_date)}</strong> —{' '}
                {counts.present} present, {counts.late} late and {counts.absent} absent. Once submitted the
                session becomes read-only for faculty.
              </>
            }
            confirmLabel="Submit attendance"
            busy={submitting}
            onConfirm={() => void submit()}
            onCancel={() => setConfirmOpen(false)}
          />
        </>
      ) : null}
    </div>
  );
}

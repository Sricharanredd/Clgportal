/**
 * Student profile: identity, contact, and the server-gated blocks
 * (attendance / published results / fees) — absent blocks mean "no permission
 * or nothing published", exactly as decided by the API.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { get } from '@/shared/api/client';
import type { StudentProfile } from '@/shared/api/types';
import { ErrorState, Spinner } from '@/components/ui/States';
import { KpiCard, Panel, formatDate } from '@/components/ui/Panel';
import { dateShort, inrExact, pct } from '@/shared/lib/format';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-plum">{value ?? '—'}</dd>
    </div>
  );
}

export default function StudentDetailPage(): JSX.Element {
  const { id } = useParams();
  const [data, setData] = useState<StudentProfile | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <Spinner label="Loading profile…" />;
  if (error) return <ErrorState error={error} onRetry={() => void load()} />;
  if (!data) return <ErrorState error={new Error('Profile not found')} />;

  return (
    <div className="space-y-5">
      <Link to="/students" className="inline-flex items-center gap-1 text-sm text-violet hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Back to students
      </Link>

      {/* Identity header */}
      <div className="glass-card flex flex-wrap items-center gap-4 rounded-2xl p-5">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet to-rose text-xl font-bold text-white">
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
          </div>
          <p className="mt-1 text-sm text-muted">
            <span className="font-mono text-violet">{data.roll_number}</span>
            {' · '}
            {data.branch_name} · {data.class_section ?? 'No class'} · {data.academic_year ?? '—'}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Identity & contact */}
        <Panel title="Profile" className="lg:col-span-1">
          <dl className="divide-y divide-periwinkle/15">
            <InfoRow label="Date of birth" value={dateShort(data.date_of_birth)} />
            <InfoRow label="Gender" value={data.gender} />
            <InfoRow label="Admission date" value={dateShort(data.admission_date)} />
            <InfoRow label="Guardian" value={data.guardian_name} />
            <InfoRow label="Phone" value={data.phone} />
            <InfoRow label="Email" value={data.email} />
            <InfoRow label="Address" value={data.address} />
          </dl>
        </Panel>

        {/* Right column: gated summary blocks */}
        <div className="space-y-5 lg:col-span-2">
          {data.attendance ? (
            <Panel title="Attendance (submitted sessions)">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <KpiCard label="Overall" value={pct(data.attendance.attendance_pct)} accent="violet" />
                <KpiCard label="Sessions" value={data.attendance.total_sessions} accent="periwinkle" />
                <KpiCard label="Present" value={data.attendance.present} accent="sage" />
                <KpiCard label="Late" value={data.attendance.late} accent="periwinkle" />
                <KpiCard label="Absent" value={data.attendance.absent} accent="rose" />
              </div>
            </Panel>
          ) : (
            <Panel title="Attendance">
              <p className="py-4 text-center text-sm text-muted">
                Attendance block not available for your role.
              </p>
            </Panel>
          )}

          <Panel title="Published results">
            {data.published_results.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                No published results yet — unpublished marks are never shown.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-periwinkle/30 text-xs uppercase tracking-wide text-muted">
                      <th className="pb-2 pr-3 font-medium">Exam</th>
                      <th className="pb-2 pr-3 font-medium">Subject</th>
                      <th className="pb-2 pr-3 text-right font-medium">Marks</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-periwinkle/20">
                    {data.published_results.map((r, i) => (
                      <tr key={`${r.subject_code}-${r.exam_title}-${i}`}>
                        <td className="py-2 pr-3 text-plum">{r.exam_title}</td>
                        <td className="py-2 pr-3 text-muted">
                          {r.subject_name} ({r.subject_code})
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold text-plum">
                          {r.is_absent ? 'AB' : `${r.marks_obtained ?? '—'} / ${r.max_marks}`}
                        </td>
                        <td className="py-2">
                          <span className="rounded-full bg-sage/20 px-2 py-0.5 text-[11px] font-semibold text-sage">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Fees">
            {data.fee ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <KpiCard label="Total" value={inrExact(data.fee.total_amount)} accent="periwinkle" />
                <KpiCard label="Paid" value={inrExact(data.fee.paid_amount)} accent="sage" />
                <KpiCard label="Pending" value={inrExact(data.fee.pending_amount)} accent="rose" />
                <KpiCard
                  label="Status"
                  value={data.fee.status}
                  hint={formatDate(data.fee.due_date)}
                  accent="violet"
                />
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted">
                Fee block not available for your role.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

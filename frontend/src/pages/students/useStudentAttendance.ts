/**
 * Attendance enrichment for the student list.
 *
 * The list endpoint (StudentSummary) intentionally carries no attendance
 * figure, so the percentage is read from the profile endpoint for the rows
 * currently on screen (never the whole result set). Results are cached per
 * student for the session and requests run with a small concurrency cap, so
 * paging back and forth is instant and the server is never flooded.
 *
 * If a profile read fails (or the role cannot see attendance) the row simply
 * shows "—" — the list keeps working.
 */
import { useEffect, useState } from 'react';
import { get } from '@/shared/api/client';
import type { StudentProfile } from '@/shared/api/types';

type AttendanceValue = number | null;

const cache = new Map<number, AttendanceValue>();

export function useStudentAttendance(ids: number[], enabled: boolean): {
  attendance: Record<number, AttendanceValue | undefined>;
  loading: boolean;
} {
  const key = ids.join(',');
  const [values, setValues] = useState<Record<number, AttendanceValue | undefined>>(() =>
    Object.fromEntries(ids.map((id) => [id, cache.get(id)])),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || ids.length === 0) {
      setLoading(false);
      return;
    }

    const missing = ids.filter((id) => !cache.has(id));
    if (missing.length === 0) {
      setValues(Object.fromEntries(ids.map((id) => [id, cache.get(id)])));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const queue = [...missing];
    const worker = async () => {
      while (queue.length > 0) {
        const id = queue.shift();
        if (id === undefined) return;
        try {
          const profile = await get<StudentProfile>(`/students/${id}`);
          cache.set(id, profile.attendance ? profile.attendance.attendance_pct : null);
        } catch {
          cache.set(id, null);
        }
      }
    };

    void Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker)).then(() => {
      if (cancelled) return;
      setValues(Object.fromEntries(ids.map((id) => [id, cache.get(id)])));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // `key` captures the exact id list; `ids` is a fresh array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return { attendance: values, loading };
}

/**
 * Open student directory — /parent/students (demo mode only).
 * Lists every student; filter is optional and never required to open a record.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, Users } from "lucide-react";
import { get } from "@/shared/api/client";
import type {
  BranchOut,
  ParentDirectoryItem,
  ParentDirectoryPage,
} from "@/shared/api/types";
import { useDebouncedValue } from "@/shared/lib/hooks";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { SearchField } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { demoGet } from "./parentClient";
import ParentShell from "./ParentShell";

const PAGE_SIZE = 12;

export default function ParentDirectoryPage(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const branch = params.get("branch_id") ?? params.get("branch") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);

  const [term, setTerm] = useState(q);
  const [branches, setBranches] = useState<BranchOut[]>([]);
  const [data, setData] = useState<ParentDirectoryPage | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const debouncedTerm = useDebouncedValue(term, 300);

  const setQuery = useCallback(
    (patch: Record<string, string | null>, replace = false) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      });
      setParams(next, { replace });
    },
    [params, setParams],
  );

  useEffect(() => {
    setTerm(q);
  }, [q]);

  useEffect(() => {
    if (debouncedTerm === q) return;
    setQuery({ q: debouncedTerm || null, page: null }, true);
  }, [debouncedTerm, q, setQuery]);

  useEffect(() => {
    void get<BranchOut[]>("/meta/branches")
      .then(setBranches)
      .catch(() => setBranches([]));
  }, []);

  const load = useCallback(async () => {
    const id = requestId.current + 1;
    requestId.current = id;
    setLoading(true);
    setError(null);
    try {
      const result = await demoGet<ParentDirectoryPage>("/students", {
        q: q || undefined,
        branch_id: branch || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      if (requestId.current === id) setData(result);
    } catch (err) {
      if (requestId.current === id) setError(err);
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  }, [q, branch, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ParentShell>
      <PageHeader
        eyebrow="Parent Portal"
        title="Student directory"
        description="Every student record is listed below. Open any row to view attendance, published results and fees — read-only."
      />

      <div className="mt-6 space-y-4">
        <SearchField
          label="Filter students"
          placeholder="Filter by name or roll number"
          value={term}
          onChange={setTerm}
        />

        {branches.length > 0 ? (
          <div
            className="no-scrollbar flex gap-1.5 overflow-x-auto"
            role="group"
            aria-label="Filter by branch"
          >
            <Chip
              pressed={!branch}
              onClick={() =>
                setQuery({ branch: null, branch_id: null, page: null })
              }
              label="All branches"
            />
            {branches.map((b) => (
              <Chip
                key={b.id}
                pressed={branch === String(b.id)}
                onClick={() =>
                  setQuery({
                    branch: null,
                    branch_id: branch === String(b.id) ? null : String(b.id),
                    page: null,
                  })
                }
                label={b.code}
                hint={b.name}
              />
            ))}
          </div>
        ) : null}

        {error ? (
          <ErrorState
            error={error}
            onRetry={() => void load()}
            title="Could not load students"
          />
        ) : loading && !data ? (
          <DirectorySkeleton />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={<Users className="h-5 w-5" aria-hidden />}
            title="No students match"
            description="Try a different name, roll number or branch. The directory lists every active student when no filter is applied."
          />
        ) : (
          <>
            <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface shadow-xs">
              {data.items.map((row) => (
                <li key={row.student_id}>
                  <StudentRow student={row} />
                </li>
              ))}
            </ul>
            {loading ? <p className="text-xs text-muted">Updating…</p> : null}
            <Pagination
              page={data.page}
              pageCount={Math.max(1, data.pages)}
              total={data.total}
              pageSize={data.page_size}
              onPageChange={(next) =>
                setQuery({ page: next <= 1 ? null : String(next) })
              }
              label="students"
            />
          </>
        )}
      </div>
    </ParentShell>
  );
}

function Chip({
  pressed,
  onClick,
  label,
  hint,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      title={hint ?? label}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center rounded-pill px-3 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
        pressed
          ? "bg-brand-500 text-white shadow-xs"
          : "border border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function StudentRow({ student }: { student: ParentDirectoryItem }) {
  return (
    <Link
      to={`/parent/students/${student.student_id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
    >
      <Avatar name={student.full_name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">
          {student.full_name}
        </p>
        <p className="mt-0.5 truncate text-[12.5px] text-muted">
          <span className="font-mono text-brand-700">
            {student.roll_number}
          </span>
          {" · "}
          {student.branch_code}
          {student.class_section ? ` · ${student.class_section}` : ""}
        </p>
      </div>
      <StatusBadge status={student.status} className="hidden sm:inline-flex" />
      <Badge tone="neutral" className="hidden md:inline-flex">
        {student.branch_code}
      </Badge>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

function DirectorySkeleton() {
  return (
    <ul
      className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface"
      aria-busy
      aria-label="Loading students"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
        </li>
      ))}
    </ul>
  );
}

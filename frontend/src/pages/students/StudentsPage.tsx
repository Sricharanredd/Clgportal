/**
 * Student directory.
 *
 * Presentation/UX only: the same GET /students endpoint is used with the
 * same filters (name, roll, branch_id) and a larger page window so the
 * client can sort the whole result set and page instantly. Attendance is the
 * one figure the list API does not return — it is read per visible row from
 * the existing profile endpoint and cached (see useStudentAttendance).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronRight, RotateCcw, SearchX, SlidersHorizontal, Users } from 'lucide-react';
import { get } from '@/shared/api/client';
import type { BranchOut, StudentSearchPage, StudentSummary } from '@/shared/api/types';
import { useAuth } from '@/app/AuthContext';
import { useDebouncedValue } from '@/shared/lib/hooks';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchField, Field, Input, Select } from '@/components/ui/Input';
import { DataTable, type Column, type SortState } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressBar } from '@/components/ui/Progress';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { useStudentAttendance } from './useStudentAttendance';

const PAGE_SIZE = 10;
/** One request covers a demo-sized directory so sort + paging stay instant. */
const FETCH_LIMIT = 100;

type SortKey = 'roll-asc' | 'roll-desc' | 'name-asc' | 'name-desc';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'roll-asc', label: 'Roll number (A–Z)' },
  { value: 'roll-desc', label: 'Roll number (Z–A)' },
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
];

function isSortKey(value: string | null): value is SortKey {
  return SORT_OPTIONS.some((option) => option.value === value);
}

export default function StudentsPage(): JSX.Element {
  const { has } = useAuth();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const roll = params.get('roll') ?? '';
  const branch = params.get('branch') ?? '';
  const sortParam = params.get('sort');
  const sort: SortKey = isSortKey(sortParam) ? sortParam : 'roll-asc';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const [term, setTerm] = useState(q);
  const [rollTerm, setRollTerm] = useState(roll);
  const [branches, setBranches] = useState<BranchOut[]>([]);
  const [data, setData] = useState<StudentSearchPage | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const debouncedTerm = useDebouncedValue(term, 300);
  const debouncedRoll = useDebouncedValue(rollTerm, 350);

  const setQuery = useCallback(
    (patch: Record<string, string | null>, replace = false) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      });
      setParams(next, { replace });
    },
    [params, setParams],
  );

  // Keep the inputs in sync when the URL changes (back/forward, palette links).
  useEffect(() => {
    setTerm(q);
  }, [q]);
  useEffect(() => {
    setRollTerm(roll);
  }, [roll]);

  // Live search: no Search button — the URL updates once typing settles.
  useEffect(() => {
    if (debouncedTerm === q) return;
    setQuery({ q: debouncedTerm || null, page: null }, true);
  }, [debouncedTerm, q, setQuery]);

  useEffect(() => {
    if (debouncedRoll === roll) return;
    setQuery({ roll: debouncedRoll || null, page: null }, true);
  }, [debouncedRoll, roll, setQuery]);

  // Branch filter options (public meta; failure only hides the chips).
  useEffect(() => {
    void get<BranchOut[]>('/meta/branches')
      .then(setBranches)
      .catch(() => setBranches([]));
  }, []);

  const load = useCallback(async () => {
    const id = requestId.current + 1;
    requestId.current = id;
    setLoading(true);
    setError(null);
    try {
      const result = await get<StudentSearchPage>('/students', {
        name: q || undefined,
        roll: roll || undefined,
        branch_id: branch || undefined,
        page: 1,
        page_size: FETCH_LIMIT,
      });
      if (requestId.current === id) setData(result);
    } catch (err) {
      if (requestId.current === id) setError(err);
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  }, [q, roll, branch]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const list = [...(data?.items ?? [])];
    list.sort((a, b) => {
      if (sort === 'name-asc' || sort === 'name-desc') {
        const result = a.full_name.localeCompare(b.full_name, undefined, { sensitivity: 'base' });
        return sort === 'name-asc' ? result : -result;
      }
      const result = a.roll_number.localeCompare(b.roll_number, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return sort === 'roll-asc' ? result : -result;
    });
    return list;
  }, [data, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Keep the URL honest if filters shrink the result set below the current page.
  useEffect(() => {
    if (data && page > pageCount) {
      setQuery({ page: pageCount > 1 ? String(pageCount) : null }, true);
    }
  }, [data, page, pageCount, setQuery]);

  const canSeeAttendance = has('attendance:read') || has('attendance:read_own');
  const { attendance, loading: attendanceLoading } = useStudentAttendance(
    pageRows.map((row) => row.id),
    canSeeAttendance,
  );

  const activeFilterCount = [q, roll, branch].filter(Boolean).length;
  const branchName = branches.find((item) => String(item.id) === branch)?.name;

  const onSortHeader = (id: string) => {
    const next: SortKey =
      id === 'student'
        ? sort === 'name-asc'
          ? 'name-desc'
          : 'name-asc'
        : sort === 'roll-asc'
          ? 'roll-desc'
          : 'roll-asc';
    setQuery({ sort: next === 'roll-asc' ? null : next, page: null }, true);
  };

  const sortState: SortState = {
    id: sort.startsWith('name') ? 'student' : 'roll',
    dir: sort.endsWith('asc') ? 'asc' : 'desc',
  };

  const attendanceCell = (student: StudentSummary) => {
    if (!canSeeAttendance) return <span className="text-[12px] text-muted">—</span>;
    const value = attendance[student.id];
    if (value === undefined && attendanceLoading) return <Skeleton className="h-1.5 w-20" />;
    if (value === undefined || value === null) {
      return (
        <span className="text-[12px] text-muted" title="No submitted attendance for this student">
          —
        </span>
      );
    }
    return (
      <div className="flex w-[7.5rem] items-center gap-2">
        <ProgressBar
          value={value}
          label={`Attendance for ${student.full_name}`}
          size="sm"
          className="flex-1"
        />
        <span className="w-9 shrink-0 text-right text-[12px] font-semibold text-ink-soft">
          {Math.round(value)}%
        </span>
      </div>
    );
  };

  const columns: Array<Column<StudentSummary>> = [
    {
      id: 'student',
      header: 'Student',
      sortable: true,
      render: (student) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={student.full_name} size="sm" />
          <p className="truncate text-[13.5px] font-bold text-ink">{student.full_name}</p>
        </div>
      ),
    },
    {
      id: 'roll',
      header: 'Roll no.',
      sortable: true,
      render: (student) => (
        <span className="font-mono text-[12px] text-ink-soft">{student.roll_number}</span>
      ),
    },
    {
      id: 'class',
      header: 'Class',
      render: (student) => (
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink-soft">{student.class_section ?? 'No class'}</p>
          <p className="text-[11px] text-muted">{student.academic_year ?? '—'}</p>
        </div>
      ),
    },
    {
      id: 'attendance',
      header: 'Attendance',
      render: (student) => attendanceCell(student),
    },
    {
      id: 'status',
      header: 'Status',
      align: 'right',
      render: (student) =>
        student.status && student.status !== 'active' ? (
          <StatusBadge status={student.status} />
        ) : null,
    },
    {
      id: 'open',
      header: '',
      align: 'right',
      render: () => (
        <ChevronRight className="ml-auto h-4 w-4 text-line-strong transition-colors group-hover:text-brand-500" aria-hidden />
      ),
    },
  ];

  const clearFilters = () => {
    setTerm('');
    setRollTerm('');
    setQuery({ q: null, roll: null, branch: null, page: null }, true);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Directory"
        title="Students"
        description="Search by name or roll number, narrow by branch, and open a profile to see attendance, results and fees."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {data ? `${data.total} student${data.total === 1 ? '' : 's'}` : 'Loading directory…'}
            </span>
            {activeFilterCount > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span>
                  {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active
                </span>
              </>
            ) : null}
          </>
        }
        actions={
          activeFilterCount > 0 ? (
            <Button variant="secondary" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null
        }
      />

      <section className="card p-4" aria-label="Search and filters">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="global-search-input" className="mb-1.5 block text-[13px] font-semibold text-ink-soft">
              Search students
            </label>
            <SearchField
              value={term}
              onChange={setTerm}
              label="Search students by name"
              placeholder="Start typing a name…"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:contents">
            <Field label="Roll number" htmlFor="filter-roll" className="w-full sm:w-44">
              <Input
                id="filter-roll"
                value={rollTerm}
                onChange={(event) => setRollTerm(event.target.value)}
                placeholder="e.g. MPC25001"
                autoComplete="off"
              />
            </Field>
            <Field label="Sort by" htmlFor="filter-sort" className="w-full sm:w-56">
              <Select
                id="filter-sort"
                value={sort}
                onChange={(event) => setQuery({ sort: event.target.value, page: null }, true)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
          <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-muted">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Branch
          </span>
          <button
            type="button"
            onClick={() => setQuery({ branch: null, page: null }, true)}
            aria-pressed={branch === ''}
            className={`rounded-pill px-3 py-1 text-[12px] font-semibold transition-colors ${
              branch === ''
                ? 'bg-brand-500 text-white shadow-xs'
                : 'border border-line bg-surface text-ink-soft hover:border-brand-200 hover:text-brand-700'
            }`}
          >
            All branches
          </button>
          {branches.map((item) => {
            const active = branch === String(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setQuery({ branch: active ? null : String(item.id), page: null }, true)}
                aria-pressed={active}
                className={`rounded-pill px-3 py-1 text-[12px] font-semibold transition-colors ${
                  active
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'border border-line bg-surface text-ink-soft hover:border-brand-200 hover:text-brand-700'
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </div>

        {activeFilterCount > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {q ? (
              <Badge tone="brand" className="gap-2">
                “{q}”
                <button
                  type="button"
                  onClick={() => {
                    setTerm('');
                    setQuery({ q: null, page: null }, true);
                  }}
                  className="rounded-full p-0.5 hover:bg-brand-100"
                  aria-label={`Remove name filter ${q}`}
                >
                  ×
                </button>
              </Badge>
            ) : null}
            {roll ? (
              <Badge tone="brand" className="gap-2">
                Roll: {roll}
                <button
                  type="button"
                  onClick={() => {
                    setRollTerm('');
                    setQuery({ roll: null, page: null }, true);
                  }}
                  className="rounded-full p-0.5 hover:bg-brand-100"
                  aria-label={`Remove roll filter ${roll}`}
                >
                  ×
                </button>
              </Badge>
            ) : null}
            {branch ? (
              <Badge tone="brand" className="gap-2">
                {branchName ?? 'Branch'}
                <button
                  type="button"
                  onClick={() => setQuery({ branch: null, page: null }, true)}
                  className="rounded-full p-0.5 hover:bg-brand-100"
                  aria-label="Remove branch filter"
                >
                  ×
                </button>
              </Badge>
            ) : null}
          </div>
        ) : null}
      </section>

      {error ? (
        <ErrorState error={error} onRetry={() => void load()} title="Could not load students" />
      ) : loading ? (
        <div className="card p-5" aria-busy="true">
          <span className="sr-only">Loading students…</span>
          <Skeleton className="h-3 w-32" />
          <SkeletonRows rows={7} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No students match those filters"
          description="Try a shorter name, a different roll number, or clear the branch filter."
          icon={<SearchX className="h-5 w-5" aria-hidden />}
          action={
            <Button variant="secondary" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          {data && data.total > rows.length ? (
            <p className="rounded-panel border border-warning/25 bg-warning-bg px-3.5 py-2 text-[12px] text-warning">
              Showing the first {rows.length} of {data.total} students — refine the search to narrow the list.
            </p>
          ) : null}
          <DataTable
            columns={columns}
            rows={pageRows}
            rowKey={(student) => student.id}
            rowTo={(student) => `/students/${student.id}`}
            rowLabel={(student) => `Open profile for ${student.full_name}`}
            sort={sortState}
            onSortChange={onSortHeader}
            caption="Students"
            footer={
              <Pagination
                page={safePage}
                pageCount={pageCount}
                total={rows.length}
                pageSize={PAGE_SIZE}
                label="students"
                onPageChange={(next) =>
                  setQuery({ page: next > 1 ? String(next) : null })
                }
              />
            }
            renderMobileCard={(student) => (
              <div className="flex items-start gap-3">
                <Avatar name={student.full_name} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13.5px] font-bold text-ink">{student.full_name}</p>
                    <ChevronRight className="h-4 w-4 shrink-0 text-line-strong" aria-hidden />
                  </div>
                  <p className="font-mono text-[11.5px] text-muted">{student.roll_number}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone="neutral">{student.class_section ?? 'No class'}</Badge>
                    <Badge tone="neutral">{student.branch_code}</Badge>
                    {student.status && student.status !== 'active' ? (
                      <StatusBadge status={student.status} />
                    ) : null}
                  </div>
                  {canSeeAttendance ? (
                    <div className="mt-2 flex items-center gap-2">
                      {attendance[student.id] === undefined && attendanceLoading ? (
                        <Skeleton className="h-1.5 flex-1" />
                      ) : attendance[student.id] === null || attendance[student.id] === undefined ? (
                        <>
                          <span className="flex-1 text-[11.5px] text-muted">No attendance yet</span>
                          <span className="w-10 text-right text-[11.5px] font-semibold text-muted">—</span>
                        </>
                      ) : (
                        <>
                          <ProgressBar
                            value={attendance[student.id] as number}
                            label={`Attendance for ${student.full_name}`}
                            size="sm"
                            className="flex-1"
                          />
                          <span className="w-10 text-right text-[11.5px] font-semibold text-ink-soft">
                            {Math.round(attendance[student.id] as number)}%
                          </span>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          />
        </>
      )}
    </div>
  );
}

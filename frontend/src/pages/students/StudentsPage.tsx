/**
 * Student directory: server-side search (name/roll), branch filter, paging.
 * Row click → profile (permission-gated blocks are decided by the server).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { get } from '@/shared/api/client';
import type { BranchOut, StudentSearchPage, StudentSummary } from '@/shared/api/types';
import { ErrorState, EmptyState, Spinner } from '@/components/ui/States';
import { Panel } from '@/components/ui/Panel';

const PAGE_SIZE = 10;

export default function StudentsPage(): JSX.Element {
  const [name, setName] = useState('');
  const [roll, setRoll] = useState('');
  const [branchId, setBranchId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [branches, setBranches] = useState<BranchOut[]>([]);
  const [data, setData] = useState<StudentSearchPage | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  // Branch filter options (public meta; failure only hides the filter).
  useEffect(() => {
    void get<BranchOut[]>('/meta/branches')
      .then(setBranches)
      .catch(() => setBranches([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await get<StudentSearchPage>('/students', {
        name: name || undefined,
        roll: roll || undefined,
        branch_id: branchId || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [name, roll, branchId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void load();
  };

  const items: StudentSummary[] = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-plum">Students</h2>
        <p className="text-sm text-muted">Search and open student profiles</p>
      </div>

      <form className="glass-card flex flex-wrap items-end gap-3 rounded-2xl p-4" onSubmit={onSearch}>
        <div className="min-w-40 flex-1">
          <label htmlFor="s-name" className="mb-1 block text-xs font-medium text-muted">
            Name
          </label>
          <input
            id="s-name"
            className="surface w-full rounded-xl px-3 py-2 text-sm text-plum placeholder:text-muted"
            placeholder="e.g. Ananya"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="w-40">
          <label htmlFor="s-roll" className="mb-1 block text-xs font-medium text-muted">
            Roll number
          </label>
          <input
            id="s-roll"
            className="surface w-full rounded-xl px-3 py-2 text-sm text-plum placeholder:text-muted"
            placeholder="MPC25001"
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
          />
        </div>
        <div className="w-44">
          <label htmlFor="s-branch" className="mb-1 block text-xs font-medium text-muted">
            Branch
          </label>
          <select
            id="s-branch"
            className="surface w-full rounded-xl px-3 py-2 text-sm text-plum"
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          <Search className="h-4 w-4" />
          Search
        </button>
      </form>

      {loading ? (
        <Spinner label="Loading students…" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyState title="No students found" hint="Try a different name, roll number, or branch." />
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-periwinkle/30 text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-4 font-medium">Roll no.</th>
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Branch</th>
                  <th className="pb-2 pr-4 font-medium">Class</th>
                  <th className="pb-2 pr-4 font-medium">Year</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-periwinkle/20">
                {items.map((s) => (
                  <tr key={s.id} className="hover:bg-white/60">
                    <td className="py-2.5 pr-4 font-mono text-xs text-violet">{s.roll_number}</td>
                    <td className="py-2.5 pr-4">
                      <Link
                        to={`/students/${s.id}`}
                        className="font-medium text-plum hover:text-violet hover:underline"
                      >
                        {s.full_name}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-muted">{s.branch_code}</td>
                    <td className="py-2.5 pr-4 text-muted">{s.class_section ?? '—'}</td>
                    <td className="py-2.5 pr-4 text-muted">{s.academic_year ?? '—'}</td>
                    <td className="py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          s.status === 'active' ? 'bg-sage/20 text-sage' : 'bg-peach/70 text-violet-600'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && data.pages > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted">
                {data.total} student{data.total === 1 ? '' : 's'} · page {data.page} of {data.pages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
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
        </Panel>
      )}
    </div>
  );
}

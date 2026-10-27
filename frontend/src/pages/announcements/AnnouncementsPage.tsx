/**
 * Announcements: paginated read for any authenticated role with
 * announcements:read; publish form for announcements:write.
 */
import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Send } from 'lucide-react';
import { ApiError, get, post } from '@/shared/api/client';
import type { AnnouncementCreate, AnnouncementPage } from '@/shared/api/types';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/States';
import { Panel } from '@/components/ui/Panel';
import { useAuth } from '@/app/AuthContext';
import { dateTime } from '@/shared/lib/format';

const AUDIENCES = ['all', 'staff', 'faculty', 'parents', 'students'] as const;

export default function AnnouncementsPage(): JSX.Element {
  const { has } = useAuth();
  const canWrite = has('announcements:write');

  const [page, setPage] = useState(1);
  const [audience, setAudience] = useState('');
  const [data, setData] = useState<AnnouncementPage | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<string>('all');
  const [publishing, setPublishing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [published, setPublished] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await get<AnnouncementPage>('/announcements', {
          page,
          page_size: 10,
          audience: audience || undefined,
        }),
      );
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, audience]);

  useEffect(() => {
    void load();
  }, [load]);

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishing(true);
    setFormError(null);
    setPublished(null);
    try {
      const payload: AnnouncementCreate = { title, body, audience: target };
      await post('/announcements', payload);
      setPublished(title);
      setTitle('');
      setBody('');
      setPage(1);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? `${err.message} (${err.code})` : 'Publishing failed.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-plum">Announcements</h2>
        <p className="text-sm text-muted">College notices visible to staff, students, and parents</p>
      </div>

      {canWrite ? (
        <Panel title="Publish announcement">
          <form className="space-y-3" onSubmit={publish}>
            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <div>
                <label htmlFor="ann-title" className="mb-1 block text-xs font-medium text-muted">
                  Title
                </label>
                <input
                  id="ann-title"
                  className="surface w-full rounded-xl px-3 py-2 text-sm text-plum placeholder:text-muted"
                  placeholder="Holiday notice"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  minLength={3}
                />
              </div>
              <div>
                <label htmlFor="ann-audience" className="mb-1 block text-xs font-medium text-muted">
                  Audience
                </label>
                <select
                  id="ann-audience"
                  className="surface w-full rounded-xl px-3 py-2 text-sm text-plum"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  {AUDIENCES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="ann-body" className="mb-1 block text-xs font-medium text-muted">
                Message
              </label>
              <textarea
                id="ann-body"
                className="surface w-full rounded-xl px-3 py-2 text-sm text-plum placeholder:text-muted"
                rows={3}
                placeholder="Details of the notice…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                minLength={5}
              />
            </div>
            {formError ? (
              <p className="rounded-xl border border-rose/40 bg-rose/10 px-3 py-2 text-sm text-plum" role="alert">
                {formError}
              </p>
            ) : null}
            {published ? (
              <p className="rounded-xl border border-sage/40 bg-sage/10 px-3 py-2 text-sm text-plum" role="status">
                Published “{published}”.
              </p>
            ) : null}
            <button type="submit" className="btn-primary" disabled={publishing}>
              <Send className="h-4 w-4" />
              {publishing ? 'Publishing…' : 'Publish'}
            </button>
          </form>
        </Panel>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="ann-filter" className="text-xs font-medium text-muted">
          Audience:
        </label>
        <select
          id="ann-filter"
          className="surface rounded-xl px-3 py-1.5 text-sm text-plum"
          value={audience}
          onChange={(e) => {
            setAudience(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All</option>
          {AUDIENCES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner label="Loading announcements…" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void load()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No announcements" hint="Published notices appear here." />
      ) : (
        <>
          <ul className="grid gap-4 md:grid-cols-2">
            {data.items.map((a) => (
              <li key={a.id} className="glass-card rounded-2xl p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-plum">
                    <Megaphone className="h-4 w-4 text-violet" aria-hidden />
                    {a.title}
                  </span>
                  <span className="rounded-full bg-periwinkle/30 px-2 py-0.5 text-[11px] font-semibold text-violet">
                    {a.audience}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted">{a.body}</p>
                <p className="mt-3 text-xs text-muted">
                  {a.is_published ? `published ${dateTime(a.published_at)}` : 'draft'}
                  {a.created_by_name ? ` · ${a.created_by_name}` : ''}
                </p>
              </li>
            ))}
          </ul>

          {data.pages > 1 ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">
                page {data.page} of {data.pages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
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
        </>
      )}
    </div>
  );
}

/**
 * Frontend feature flags (Vite env, build-time).
 *
 * `VITE_DEMO_OPEN_PARENT=true` turns the parent portal into a no-login demo:
 * Home → Parent Portal opens the student directory and every record is
 * read-only. Set it to `false` (or omit it) to get the verified lookup flow
 * back — the backend flag `DEMO_OPEN_PARENT` must match, because the open
 * endpoints return 404 when it is off.
 */
function envFlag(value: string | undefined): boolean {
  return (value ?? '').trim().toLowerCase() === 'true';
}

export const DEMO_OPEN_PARENT = envFlag(import.meta.env.VITE_DEMO_OPEN_PARENT);

/**
 * Isolated client for the parent portal.
 *
 * Parent tokens are issued by /parent/verify (no refresh cookie is involved),
 * so this client intentionally does NOT share the staff axios instance or its
 * silent-refresh logic. On 401 the portal restarts the lookup flow.
 *
 * The token is kept in memory plus `sessionStorage` (per-tab, cleared when the
 * tab closes) so a browser refresh on /parent/student/:id keeps the session.
 * It is never placed in a URL, localStorage, or a cookie.
 */
import axios, { AxiosError } from 'axios';
import type { ApiErrorBody } from '@/shared/api/types';
import { ApiError, toApiError } from '@/shared/api/client';

const SESSION_KEY = 'cmp.parent.session';

interface StoredSession {
  token: string;
  parentName: string;
}

let session: StoredSession | null = null;

function readStored(): StoredSession | null {
  if (session) return session;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) session = JSON.parse(raw) as StoredSession;
  } catch {
    // Storage unavailable (private mode etc.) — fall back to memory-only.
  }
  return session;
}

export function setParentSession(token: string, parentName: string): void {
  session = { token, parentName };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Memory-only fallback.
  }
}

export function clearParentSession(): void {
  session = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Memory-only fallback.
  }
}

export function getParentToken(): string | null {
  return readStored()?.token ?? null;
}

export function getParentName(): string | null {
  return readStored()?.parentName ?? null;
}

export const parentApi = axios.create({ baseURL: '/api/v1' });

parentApi.interceptors.request.use((config) => {
  const token = getParentToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

parentApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => Promise.reject(toApiError(error)),
);

export async function parentGet<T>(
  url: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  try {
    const { data } = await parentApi.get<T>(url, { params });
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function parentPost<T>(url: string, body?: unknown): Promise<T> {
  try {
    const { data } = await parentApi.post<T>(url, body);
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export { ApiError };

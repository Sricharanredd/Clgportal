/**
 * Axios client for /api/v1.
 *
 * - Access token lives **in memory only** (never localStorage).
 * - Refresh uses the HttpOnly cookie; on a 401 the client performs ONE silent
 *   refresh (single-flight) and retries the original request.
 * - Every failure surfaces as `ApiError` with the backend envelope fields.
 */
import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import type { ApiErrorBody, TokenResponse } from './types';

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Normalised error carrying the backend error envelope. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const ax = err as AxiosError<ApiErrorBody>;
  const status = ax.response?.status ?? 0;
  const body = ax.response?.data;
  if (body && typeof body === 'object' && 'error' in body && body.error) {
    return new ApiError(
      status,
      body.error.code,
      body.error.message,
      body.error.details,
      body.error.request_id,
    );
  }
  if (ax.code === 'ERR_NETWORK' || !ax.response) {
    return new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Is the API running?');
  }
  return new ApiError(status, ax.code ?? 'UNKNOWN_ERROR', ax.message);
}

/** Fired when a silent refresh fails and the session is gone. */
export const SESSION_EXPIRED_EVENT = 'cmp:session-expired';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // send the HttpOnly refresh cookie
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/** Single-flight refresh: concurrent 401s share one refresh call. */
let refreshPromise: Promise<boolean> | null = null;

export function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<TokenResponse>('/api/v1/auth/refresh', null, { withCredentials: true })
      .then((res) => {
        accessToken = res.data.access_token;
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface RetriableConfig extends AxiosRequestConfig {
  _retried?: boolean;
}

const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = typeof config?.url === 'string' ? config.url : '';
    const isAuthCall = AUTH_PATHS.some((p) => url.includes(p));

    if (status === 401 && config && !config._retried && !isAuthCall) {
      config._retried = true;
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${accessToken}`,
        } as typeof config.headers;
        return api(config);
      }
      accessToken = null;
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(toApiError(error));
  },
);

/** Convenience GET that returns typed data or throws `ApiError`. */
export async function get<T>(
  url: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  try {
    const { data } = await api.get<T>(url, { params });
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

/** Convenience POST that returns typed data or throws `ApiError`. */
export async function post<T>(
  url: string,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  try {
    const { data } = await api.post<T>(url, body, { params });
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

/** Convenience PUT that returns typed data or throws `ApiError`. */
export async function put<T>(
  url: string,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  try {
    const { data } = await api.put<T>(url, body, { params });
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

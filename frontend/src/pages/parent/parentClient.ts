/**
 * Isolated client for the parent portal.
 *
 * Parent tokens are issued by /parent/verify (no refresh cookie is involved),
 * so this client intentionally does NOT share the staff axios instance or its
 * silent-refresh logic. On 401 the portal restarts the lookup flow.
 */
import axios, { AxiosError } from 'axios';
import type { ApiErrorBody } from '@/shared/api/types';
import { ApiError, toApiError } from '@/shared/api/client';

let parentToken: string | null = null;

export function setParentToken(token: string | null): void {
  parentToken = token;
}

export function getParentToken(): string | null {
  return parentToken;
}

export const parentApi = axios.create({ baseURL: '/api/v1' });

parentApi.interceptors.request.use((config) => {
  if (parentToken) {
    config.headers.Authorization = `Bearer ${parentToken}`;
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

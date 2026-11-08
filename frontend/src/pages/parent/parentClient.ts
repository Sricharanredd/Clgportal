/**
 * Client for the open (demo) parent portal.
 *
 * The demo endpoints are unauthenticated and flag-gated on the server: when
 * `DEMO_OPEN_PARENT` is false they return 404. This client therefore has no
 * token handling and never triggers the staff refresh flow.
 */
import axios, { AxiosError } from 'axios';
import type { ApiErrorBody } from '@/shared/api/types';
import { ApiError, toApiError } from '@/shared/api/client';

const demoApi = axios.create({ baseURL: '/api/v1' });

demoApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => Promise.reject(toApiError(error)),
);

/** GET against `/parent/demo/*` (flag-gated on the server). */
export async function demoGet<T>(
  url: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  try {
    const { data } = await demoApi.get<T>(`/parent/demo${url}`, { params });
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export { ApiError };

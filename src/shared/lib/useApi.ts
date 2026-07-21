import { useCallback, useMemo, useState } from "react";
import type { AxiosRequestConfig } from "axios";
import { ApiError, apiGet, apiPostForm, apiPostJson } from "./api";

interface UseApiState {
  /** True while a request started by this hook is in flight. */
  loading: boolean;
  /** The last request's error (already normalized to `ApiError`), or null. */
  error: ApiError | null;
}

export interface UseApi extends UseApiState {
  get<T>(path: string, config?: AxiosRequestConfig): Promise<T>;
  post<T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<T>;
  postForm<T>(path: string, form: FormData, config?: AxiosRequestConfig): Promise<T>;
  /** Clear the last error (e.g. when the user edits the form and retries). */
  reset(): void;
}

/**
 * Reusable data-access hook. Wraps the shared axios instance and tracks
 * `loading`/`error` for the component, so callers get consistent request
 * plumbing without repeating try/catch/finally:
 *
 *   const api = useApi();
 *   await api.post("/otp/request", { phone });   // api.loading / api.error update
 *
 * Every helper rejects with `ApiError` (status + message), so callers can still
 * branch on `err.status` (401, 429, …). The returned object is stable except
 * for `loading`/`error`.
 */
export function useApi(): UseApi {
  const [{ loading, error }, setState] = useState<UseApiState>({ loading: false, error: null });

  const run = useCallback(async <T>(op: () => Promise<T>): Promise<T> => {
    setState({ loading: true, error: null });
    try {
      const data = await op();
      setState({ loading: false, error: null });
      return data;
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(0, (e as Error)?.message ?? "Request failed");
      setState({ loading: false, error: err });
      throw err;
    }
  }, []);

  const reset = useCallback(() => setState({ loading: false, error: null }), []);

  const helpers = useMemo(
    () => ({
      get: <T>(path: string, config?: AxiosRequestConfig) => run(() => apiGet<T>(path, config)),
      post: <T>(path: string, body?: unknown, config?: AxiosRequestConfig) =>
        run(() => apiPostJson<T>(path, body, config)),
      postForm: <T>(path: string, form: FormData, config?: AxiosRequestConfig) =>
        run(() => apiPostForm<T>(path, form, config)),
      reset,
    }),
    [run, reset],
  );

  return { loading, error, ...helpers };
}

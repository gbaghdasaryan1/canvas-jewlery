import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios";

/**
 * Backend base URL. Point it at the API with `VITE_API_BASE`
 * (e.g. https://api.cairn.studio). Empty string = same-origin `/…` paths,
 * which also lets a dev proxy handle it.
 */
export const API_BASE: string = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

/** Error carrying the HTTP status so callers can branch (e.g. 401 → bad OTP). */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/** Shared axios instance — every request in the app goes through this. */
export const http: AxiosInstance = axios.create({
  baseURL: API_BASE || undefined,
});

/**
 * Normalize every failure into an `ApiError` so callers only branch on
 * `status`/`message` (matches the old fetch behaviour). `status` is 0 when the
 * request never reached the server (network down, CORS, timeout).
 */
http.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;
    let message = error.message;
    if (data && typeof data === "object" && "message" in data) {
      message = String((data as { message: unknown }).message);
    } else if (typeof data === "string" && data) {
      message = data;
    }
    return Promise.reject(new ApiError(status, message || `Request failed (${status})`));
  },
);

/** GET JSON. */
export async function apiGet<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.get<T>(path, config);
  return res.data;
}

/** POST a JSON body. */
export async function apiPostJson<T>(path: string, body: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.post<T>(path, body, config);
  return res.data;
}

/** POST multipart form-data (axios sets the boundary Content-Type from the FormData). */
export async function apiPostForm<T>(path: string, form: FormData, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.post<T>(path, form, config);
  return res.data;
}

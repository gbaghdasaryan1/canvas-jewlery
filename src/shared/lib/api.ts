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

function url(path: string): string {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    let message = res.statusText || `Request failed (${res.status})`;
    if (data && typeof data === "object" && "message" in data) {
      message = String((data as { message: unknown }).message);
    }
    throw new ApiError(res.status, message);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** POST a JSON body. */
export async function apiPostJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(url(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parse<T>(res);
}

/** POST multipart form-data (no explicit Content-Type — the browser sets the boundary). */
export async function apiPostForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(url(path), { method: "POST", body: form });
  return parse<T>(res);
}

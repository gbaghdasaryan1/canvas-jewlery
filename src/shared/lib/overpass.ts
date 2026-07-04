/**
 * Resilient Overpass API client. The public instances are heavily loaded and
 * frequently return 429 (rate limited) or 504 (timeout), so we try several
 * mirrors in turn with a per-request timeout and only fail if all are down.
 */
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

const TIMEOUT_MS = 30000;

export interface OverpassWay {
  type: string;
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements?: OverpassWay[];
  remark?: string;
}

export async function overpass(query: string): Promise<OverpassResponse> {
  let lastError: unknown;

  for (const url of ENDPOINTS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        body: "data=" + encodeURIComponent(query),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        lastError = new Error(`Overpass ${res.status} @ ${url}`);
        continue; // rate-limited / timed out — try the next mirror
      }
      const json = (await res.json()) as OverpassResponse;
      // A server-side timeout still returns 200 but with a remark and no data.
      if (json.remark && !json.elements?.length) {
        lastError = new Error(`Overpass remark: ${json.remark}`);
        continue;
      }
      return json;
    } catch (err) {
      lastError = err; // network error or abort — try the next mirror
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Overpass request failed");
}

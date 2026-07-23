/**
 * Resilient Overpass API client. Public instances are heavily loaded, often
 * rate-limit (429), and — depending on the viewer's network/region — some are
 * flat-out unreachable. A sequential walk with a long timeout can burn minutes
 * on a hung mirror, so instead we RACE the mirrors with a staggered start:
 * the first one starts immediately, the next joins every STAGGER_MS until one
 * succeeds; the winner is remembered and tried first for the rest of the
 * session, and all losing requests are aborted.
 */
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const TIMEOUT_MS = 30000; // per-mirror hard cap
const STAGGER_MS = 2500; // how long a mirror gets before the next one joins

/** Mirror that answered last — tried first, and remembered across reloads
    so a fresh page load doesn't re-probe mirrors that are dead on this network. */
const PREF_KEY = "overpass:preferred";
let preferred: string | null = null;
try {
  const saved = localStorage.getItem(PREF_KEY);
  if (saved && ENDPOINTS.includes(saved)) preferred = saved;
} catch {
  /* SSR / storage blocked — session-only memory */
}

function rememberWinner(url: string) {
  preferred = url;
  try {
    localStorage.setItem(PREF_KEY, url);
  } catch {
    /* ignore */
  }
}

export interface OverpassWay {
  type: string;
  geometry?: Array<{ lat: number; lon: number }>;
  /** present on node elements */
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements?: OverpassWay[];
  remark?: string;
}

async function tryEndpoint(
  url: string,
  query: string,
  signal: AbortSignal,
): Promise<OverpassResponse> {
  const res = await fetch(url, {
    method: "POST",
    body: "data=" + encodeURIComponent(query),
    signal,
  });
  if (!res.ok) throw new Error(`Overpass ${res.status} @ ${url}`);
  const json = (await res.json()) as OverpassResponse;
  // A server-side timeout still returns 200 but with a remark and no data.
  if (json.remark && !json.elements?.length) {
    throw new Error(`Overpass remark: ${json.remark}`);
  }
  return json;
}

export function overpass(query: string, signal?: AbortSignal): Promise<OverpassResponse> {
  const order = preferred
    ? [preferred, ...ENDPOINTS.filter((u) => u !== preferred)]
    : [...ENDPOINTS];

  return new Promise((resolve, reject) => {
    const ctrls: AbortController[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let next = 0; // index of the next mirror to launch
    let inFlight = 0;
    let settled = false;
    let lastError: unknown;

    const finish = (json: OverpassResponse | null, err?: unknown) => {
      if (settled) return;
      settled = true;
      timers.forEach(clearTimeout);
      ctrls.forEach((c) => c.abort());
      if (json) resolve(json);
      else reject(err instanceof Error ? err : new Error("Overpass request failed"));
    };

    // Caller cancelled (e.g. React Query unsubscribed): stop all mirrors.
    signal?.addEventListener("abort", () =>
      finish(null, new DOMException("Aborted", "AbortError")),
    );

    const launch = () => {
      if (settled || next >= order.length) return;
      const url = order[next++];
      inFlight++;
      const ctrl = new AbortController();
      ctrls.push(ctrl);
      const kill = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      timers.push(kill);
      tryEndpoint(url, query, ctrl.signal)
        .then((json) => {
          rememberWinner(url);
          finish(json);
        })
        .catch((err) => {
          inFlight--;
          if (settled) return;
          lastError = err;
          if (next < order.length)
            launch(); // a failure frees a slot — bring the next mirror in now
          else if (inFlight === 0) finish(null, lastError);
        })
        .finally(() => clearTimeout(kill));
    };

    launch();
    for (let i = 1; i < order.length; i++) {
      timers.push(setTimeout(launch, i * STAGGER_MS));
    }
  });
}

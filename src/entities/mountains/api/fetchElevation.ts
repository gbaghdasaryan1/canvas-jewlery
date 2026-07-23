import { GRID } from "@/shared/config/presets";
// import { isGoogleAuthFailed, whenGoogleReady } from "@/shared/lib/googleMaps";
import type { mountainsGrid } from "../model/types";
import { proceduralmountains } from "../lib/procedural";

const CHUNK = 512; // Google Elevation API accepts up to 512 locations per request
const REQUEST_TIMEOUT_MS = 10000;

/**
 * When the SDK's auth check fails (bad key, referrer not allowed) an in-flight
 * ElevationService call never settles — it neither resolves nor rejects. Guard
 * every request with a timeout so we can still fall back to procedural mountains.
 * Later calls on a failed SDK return `undefined` instead of a promise; treat
 * that as a failure too.
 */
function withTimeout<T>(p: Promise<T> | undefined, ms: number): Promise<T> {
  if (!p) return Promise.reject(new Error("elevation service unavailable"));
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("elevation request timed out")), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Sample a GRID×GRID patch of real elevations around the chosen coordinate
 * via the Google Elevation service (Maps JS SDK, CORS-free). Falls back to
 * deterministic procedural mountains when the SDK never loads (no API key,
 * offline) or a request fails — the source badge shows which one you got.
 */
export async function fetchElevation(
  lat: number,
  lng: number,
  areaKm: number,
): Promise<mountainsGrid> {
  // The Maps JS SDK is injected lazily by the map widget. Wait for it before
  // sampling real elevation; only fall back to procedural if it never arrives.
  // if (!(await whenGoogleReady())) {
  //   return proceduralmountains(lat, lng);
  // }

  const dLat = areaKm / 111;
  const dLng = areaKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);

  const locations: Array<{ lat: number; lng: number }> = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      locations.push({
        lat: lat - dLat / 2 + (dLat * r) / (GRID - 1),
        lng: lng - dLng / 2 + (dLng * c) / (GRID - 1),
      });
    }
  }

  const out = new Float32Array(GRID * GRID);

  try {
    const elevator = new google.maps.ElevationService();
    const offsets: number[] = [];
    for (let i = 0; i < locations.length; i += CHUNK) offsets.push(i);

    // Fetch one chunk, retrying transient failures (Google throttles bursts
    // with OVER_QUERY_LIMIT) with a short backoff before giving up.
    const fetchChunk = async (i: number): Promise<void> => {
      let lastErr: unknown;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const { results } = await withTimeout(
            elevator.getElevationForLocations({ locations: locations.slice(i, i + CHUNK) }),
            REQUEST_TIMEOUT_MS,
          );
          for (let k = 0; k < results.length; k++) out[i + k] = results[k].elevation;
          return;
        } catch (e) {
          lastErr = e;
          await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        }
      }
      throw lastErr;
    };

    // Bounded concurrency — a dense grid (GRID² points) is many chunks; firing
    // them all at once trips Google's rate limit and the whole run fails over
    // to procedural terrain. A small pool stays fast without getting throttled.
    const CONCURRENCY = 5;
    let cursor = 0;
    const worker = async () => {
      while (cursor < offsets.length) await fetchChunk(offsets[cursor++]);
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, offsets.length) }, worker));

    let mn = Infinity,
      mx = -Infinity;
    for (const e of out) {
      if (e < mn) mn = e;
      if (e > mx) mx = e;
    }
    return { data: out, min: mn, max: mx, source: "dem" };
  } catch {
    return proceduralmountains(lat, lng);
  }
}

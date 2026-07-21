import { useJsApiLoader, type Libraries } from "@react-google-maps/api";

export const GOOGLE_MAPS_API_KEY: string =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

// "places" powers the search-box autocomplete. Kept as a stable module-level
// reference so the loader doesn't warn about a changing `libraries` array.
const LIBRARIES: Libraries = ["places"];

/**
 * Single source of truth for loading the Google Maps JS SDK. Every component
 * that needs the SDK calls this hook — @react-google-maps/api dedupes by `id`,
 * so the script is injected once no matter who renders first.
 */
export function useGoogleMaps() {
  return useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });
}

/**
 * Resolves once the Google Maps JS SDK is available on `window.google.maps`.
 *
 * The SDK is injected lazily by whichever widget mounts first, and non-React
 * code (e.g. the elevation fetcher) can fire before that finishes — so callers
 * await this instead of immediately falling back.
 *
 * Resolves `true` when ready, or `false` if it doesn't appear within
 * `timeoutMs` (no API key, blocked network) so the caller can degrade.
 */
export function whenGoogleReady(timeoutMs = 8000): Promise<boolean> {
  if (!GOOGLE_MAPS_API_KEY) return Promise.resolve(false);
  if (typeof google !== "undefined" && google.maps?.ElevationService) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (typeof google !== "undefined" && google.maps?.ElevationService) {
        resolve(true);
      } else if (Date.now() - start >= timeoutMs) {
        resolve(false);
      } else {
        setTimeout(tick, 120);
      }
    };
    tick();
  });
}

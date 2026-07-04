/**
 * Resolves once the Google Maps JS SDK is available on `window.google.maps`.
 *
 * The SDK is injected lazily by the map widget's `useJsApiLoader`. Elevation
 * requests can fire before that finishes, so callers await this instead of
 * immediately falling back to procedural terrain.
 *
 * Resolves `true` when ready, or `false` if it doesn't appear within `timeoutMs`
 * (e.g. no API key, blocked network) so the caller can use the fallback.
 */
export function whenGoogleReady(timeoutMs = 8000): Promise<boolean> {
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

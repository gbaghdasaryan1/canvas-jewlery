import { smoothGrid } from "./smooth";

/**
 * Compose the normalized (0..1) heightfield that drives the ring/plaque relief.
 *
 * Bare-earth terrain (metres) optionally gets a building-height field added on
 * top — that's what makes a city's skyline show up instead of a flat disc —
 * then the result is normalized over its own range and smoothed. Pure (no entity
 * imports) so the viewer and the STL export can share one source of truth.
 */
export function composeHeightField(
  data: Float32Array,
  min: number,
  max: number,
  structures: Float32Array | null,
  smooth: number,
): Float32Array {
  let d = data;
  let lo = min;
  let hi = max;

  if (structures) {
    d = new Float32Array(data.length);
    lo = Infinity;
    hi = -Infinity;
    for (let i = 0; i < d.length; i++) {
      const v = data[i] + structures[i];
      d[i] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }

  const span = hi - lo || 1;
  const norm = new Float32Array(d.length);
  for (let i = 0; i < d.length; i++) norm[i] = (d[i] - lo) / span;
  return smoothGrid(norm, smooth);
}

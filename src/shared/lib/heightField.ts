import { smoothGrid } from "./smooth";

/**
 * Compose the normalized (0..1) heightfield that drives the ring/plaque relief.
 *
 * Bare-earth mountains (metres) optionally gets a building-height field added on
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

/**
 * Compose the normalized (0..1) heightfield for a city skyline piece — no
 * mountains underneath. Ground sits at 0, streets read as low raised ridges,
 * and buildings rise with their real height (gamma-eased so low-rise blocks
 * stay visible next to skyscrapers). Pure, so the viewer, the STL export and
 * pricing share one source of truth.
 */
export function composeCityField(
  buildingHeights: Float32Array | null,
  streetMask: Float32Array | null,
  smooth: number,
): Float32Array {
  const n = buildingHeights?.length ?? streetMask?.length ?? 0;
  const out = new Float32Array(n);
  if (n === 0) return out;

  let maxH = 0;
  if (buildingHeights) for (let i = 0; i < n; i++) if (buildingHeights[i] > maxH) maxH = buildingHeights[i];

  const STREET_H = 0.1; // street ridge height (fraction of full relief)
  const BASE = 0.24; // even a 1-storey building clears the streets
  const GAMMA = 0.6;

  for (let i = 0; i < n; i++) {
    const b = buildingHeights?.[i] ?? 0;
    if (b > 0 && maxH > 0) out[i] = BASE + (1 - BASE) * Math.pow(b / maxH, GAMMA);
    else if (streetMask && streetMask[i] > 0) out[i] = STREET_H;
  }
  return smoothGrid(out, smooth);
}

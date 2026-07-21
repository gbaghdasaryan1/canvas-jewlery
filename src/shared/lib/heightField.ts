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

/**
 * Rotate a square (N×N, row-major) heightfield about its centre by `degrees`,
 * resampling bilinearly. Used for the "Orientation" control: rotating the field
 * (rather than the mesh) turns the relief while leaving the edge-based frame and
 * the plate outline fixed — so only the inner design spins under the frame.
 * Out-of-bounds samples clamp to the edge, and since the perimeter sits under
 * the frame band, the corners swept in by rotation stay hidden.
 */
export function rotateHeightField(src: Float32Array, degrees: number): Float32Array {
  if (!degrees) return src;
  const N = Math.round(Math.sqrt(src.length));
  const out = new Float32Array(src.length);
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const c = (N - 1) / 2;

  const sample = (x: number, y: number): number => {
    x = Math.min(Math.max(x, 0), N - 1);
    y = Math.min(Math.max(y, 0), N - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, N - 1), y1 = Math.min(y0 + 1, N - 1);
    const tx = x - x0, ty = y - y0;
    const a = src[y0 * N + x0], b = src[y0 * N + x1];
    const d = src[y1 * N + x0], e = src[y1 * N + x1];
    return (a + (b - a) * tx) * (1 - ty) + (d + (e - d) * tx) * ty;
  };

  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const dx = i - c, dy = j - c;
      // Inverse-rotate the output cell back into the source field.
      const sx = c + dx * cos + dy * sin;
      const sy = c - dx * sin + dy * cos;
      out[j * N + i] = sample(sx, sy);
    }
  }
  return out;
}

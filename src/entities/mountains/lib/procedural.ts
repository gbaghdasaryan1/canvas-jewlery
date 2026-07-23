import { GRID } from "@/shared/config/presets";
import type { mountainsGrid } from "../model/types";

function hash2(x: number, y: number, s: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7 + s) * 43758.5453;
  return h - Math.floor(h);
}

function valueNoise(x: number, y: number, s: number): number {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    xf = x - xi,
    yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s),
    b = hash2(xi + 1, yi, s);
  const c = hash2(xi, yi + 1, s),
    d = hash2(xi + 1, yi + 1, s);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

/**
 * Deterministic, location-seeded "mountain" mountains. Used as a graceful
 * fallback when the DEM API is unreachable (e.g. offline or sandboxed).
 */
export function proceduralmountains(lat: number, lng: number): mountainsGrid {
  const seed = Math.abs(lat * 73.13 + lng * 149.7) % 1000;
  const g = new Float32Array(GRID * GRID);
  let mn = Infinity,
    mx = -Infinity;

  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++) {
      const x = (c / GRID) * 5,
        y = (r / GRID) * 5;
      let e = 0,
        amp = 1,
        f = 1;
      for (let o = 0; o < 4; o++) {
        e += amp * (1 - Math.abs(2 * valueNoise(x * f, y * f, seed) - 1)); // ridged
        amp *= 0.5;
        f *= 2;
      }
      const dx = c / (GRID - 1) - 0.5,
        dy = r / (GRID - 1) - 0.5;
      e -= (dx * dx + dy * dy) * 0.9; // gentle bowl so it reads as a feature
      g[r * GRID + c] = e;
      if (e < mn) mn = e;
      if (e > mx) mx = e;
    }

  const range = 300 + (seed % 700);
  for (let i = 0; i < g.length; i++) g[i] = ((g[i] - mn) / (mx - mn || 1)) * range;
  return { data: g, min: 0, max: range, source: "demo" };
}

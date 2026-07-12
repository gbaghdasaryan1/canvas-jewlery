import polygonClipping from "polygon-clipping";
import { heartBoundary, circleBoundary, FRAME_MM, FRAME_HEIGHT_MM } from "@/shared/lib/ringGeometry";
import type { Shape } from "@/entities/ring/model/types";

export { FRAME_MM, FRAME_HEIGHT_MM };

/**
 * Geometry helpers shared by the on-screen city view (CityViewer) and the STL
 * builder (buildCityMesh) so the downloaded file always matches the canvas:
 * one outline, one inside-test, one road-width table.
 */

export type Pt = { x: number; z: number };

export interface RoadStyle {
  color: string;
  widthM: number;
  lift: number;
}
export const ROAD_DEFAULT: RoadStyle = { color: "#d3e5f6", widthM: 6, lift: 2 };
export const ROAD_STYLES: Record<string, RoadStyle> = {
  motorway: { color: "#9ec9f0", widthM: 18, lift: 3 },
  trunk: { color: "#9ec9f0", widthM: 18, lift: 3 },
  primary: { color: "#9ec9f0", widthM: 14, lift: 3 },
  secondary: { color: "#9ec9f0", widthM: 14, lift: 3 },
  tertiary: { color: "#9ec9f0", widthM: 10, lift: 2 },
  street: { color: "#9ec9f0", widthM: 8, lift: 2 },
  street_limited: { color: "#9ec9f0", widthM: 8, lift: 2 },
  service: { color: "#9ec9f0", widthM: 6, lift: 2 },
  track: { color: "#9ec9f0", widthM: 6, lift: 2 },
  path: { color: "#9ec9f0", widthM: 4, lift: 1 },
  pedestrian: { color: "#9ec9f0", widthM: 4, lift: 1 },
  major_rail: { color: "#9ec9f0", widthM: 3, lift: 1 },
  minor_rail: { color: "#9ec9f0", widthM: 3, lift: 1 },
};

export const RECT_OUTLINE: Pt[] = [
  { x: -0.5, z: -0.5 }, { x: 0.5, z: -0.5 }, { x: 0.5, z: 0.5 }, { x: -0.5, z: 0.5 },
];

/**
 * Offset a closed outline inward by `d` (normalized units) using per-vertex
 * miter offsets. Works for any winding; the miter is clamped so sharp cusps
 * (the heart notch) don't spike. The result bounds the city content inside
 * the raised frame band.
 */
export function insetOutline(outline: Pt[], d: number): Pt[] {
  const n = outline.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = outline[i], b = outline[(i + 1) % n];
    area += a.x * b.z - b.x * a.z;
  }
  const s = area >= 0 ? 1 : -1;
  const inward = (a: Pt, b: Pt): Pt => {
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    return { x: (-dz / len) * s, z: (dx / len) * s };
  };
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const prev = outline[(i - 1 + n) % n], cur = outline[i], next = outline[(i + 1) % n];
    const n1 = inward(prev, cur), n2 = inward(cur, next);
    let mx = n1.x + n2.x, mz = n1.z + n2.z;
    const ml = Math.hypot(mx, mz);
    if (ml < 1e-6) { mx = n2.x; mz = n2.z; } else { mx /= ml; mz /= ml; }
    const cos = Math.max(mx * n1.x + mz * n1.z, 0.25);
    out.push({ x: cur.x + (mx * d) / cos, z: cur.z + (mz * d) / cos });
  }
  return out;
}

/**
 * Stepped taper for landmark towers (man_made=tower — Eiffel & co). Extruding
 * a lattice tower's footprint straight up gives a monolith; stacking slices of
 * the footprint scaled by `s` over height band t0..t1 reads as a spire.
 */
export const TOWER_PROFILE: Array<{ t0: number; t1: number; s: number }> = [
  { t0: 0, t1: 0.12, s: 1 },
  { t0: 0.12, t1: 0.3, s: 0.6 },
  { t0: 0.3, t1: 0.5, s: 0.38 },
  { t0: 0.5, t1: 0.7, s: 0.24 },
  { t0: 0.7, t1: 0.88, s: 0.15 },
  { t0: 0.88, t1: 1, s: 0.09 },
];

/**
 * Height → 0..1 relief fraction with a soft knee: typical buildings (up to the
 * 95th percentile) spread linearly over the lower 85% of the relief, and
 * outliers (a 330 m Eiffel over 20 m Paris blocks) compress into the top 15%
 * instead of flattening everything else. Monotonic; the tallest structure
 * always reaches exactly 1.
 */
export function makeHeightScale(heights: number[]): (h: number) => number {
  if (!heights.length) return () => 0;
  const sorted = [...heights].sort((a, b) => a - b);
  const max = sorted[sorted.length - 1];
  if (max <= 0) return () => 0;
  const p95 = sorted[Math.floor(0.95 * (sorted.length - 1))];
  if (p95 <= 0 || p95 >= max) return (h) => h / max;
  const KNEE = 0.85;
  return (h) =>
    h <= p95 ? (h / p95) * KNEE : KNEE + (1 - KNEE) * ((h - p95) / (max - p95));
}

/** The plate outline for a shape, in the normalized [-0.5, 0.5] plane — the
    same curves the cast metal mesh uses. */
export function shapeOutline(shape: Shape): Pt[] {
  if (shape === "heart") return heartBoundary(128);
  if (shape === "circle") return circleBoundary(128);
  return RECT_OUTLINE;
}

/** Ray-casting point-in-polygon in the normalized outline plane. */
export function insidePoly(x: number, z: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

export function makeInside(shape: Shape, outline: Pt[]) {
  if (shape === "rectangle") {
    let hx = 0, hz = 0;
    for (const p of outline) {
      hx = Math.max(hx, Math.abs(p.x));
      hz = Math.max(hz, Math.abs(p.z));
    }
    return (x: number, z: number) => Math.abs(x) <= hx && Math.abs(z) <= hz;
  }
  return (x: number, z: number) => insidePoly(x, z, outline);
}

/**
 * Intersection of a footprint ring with the plate outline (both in the
 * normalized plane). Buildings straddling the edge come back sliced at the
 * boundary — full height, cut footprint — instead of being dropped. Handles
 * the concave heart correctly. Returns 0..n rings.
 */
export function clipRingToOutline(ring: Pt[], outline: Pt[]): Pt[][] {
  try {
    const res = polygonClipping.intersection(
      [[ring.map((p) => [p.x, p.z] as [number, number])]],
      [[outline.map((p) => [p.x, p.z] as [number, number])]],
    );
    return res
      .map((poly) => {
        const r = poly[0].map(([x, z]) => ({ x, z }));
        const first = r[0], last = r[r.length - 1];
        if (r.length > 1 && first.x === last.x && first.z === last.z) r.pop();
        return r;
      })
      .filter((r) => r.length >= 3);
  } catch {
    return []; // degenerate ring — skip it rather than crash the frame
  }
}

/** Point where the segment from the inside point (ix,iz) toward the outside
    point (ox,oz) crosses the outline — bisection, works for any shape. */
export function makeClipToBoundary(inside: (x: number, z: number) => boolean) {
  return (ix: number, iz: number, ox: number, oz: number): Pt => {
    let lo = 0, hi = 1;
    for (let k = 0; k < 14; k++) {
      const mid = (lo + hi) / 2;
      if (inside(ix + (ox - ix) * mid, iz + (oz - iz) * mid)) lo = mid;
      else hi = mid;
    }
    return { x: ix + (ox - ix) * lo, z: iz + (oz - iz) * lo };
  };
}

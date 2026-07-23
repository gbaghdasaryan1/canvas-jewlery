import polygonClipping from "polygon-clipping";
import type { MultiPolygon, Polygon } from "polygon-clipping";

/** Shared 2D polygon math. Coordinates are y-down (screen space); units are
 *  whatever the caller uses (silhouette pixels or pendant millimetres). */
export interface Vec2 {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

export function polygonSignedArea(poly: Vec2[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

export function polygonArea(poly: Vec2[]): number {
  return Math.abs(polygonSignedArea(poly));
}

export function polygonBounds(polys: Vec2[] | Vec2[][]): Bounds {
  const rings: Vec2[][] =
    polys.length && Array.isArray(polys[0]) ? (polys as Vec2[][]) : [polys as Vec2[]];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of rings) {
    for (const p of ring) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (!isFinite(minX)) minX = minY = maxX = maxY = 0;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  };
}

export function pointInPolygon(p: Vec2, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function pointSegmentDist(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Minimum distance from a point to the polygon's boundary. */
export function distToPolygonEdge(p: Vec2, poly: Vec2[]): number {
  let min = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const d = pointSegmentDist(p, poly[i], poly[(i + 1) % poly.length]);
    if (d < min) min = d;
  }
  return min;
}

/** Chaikin corner-cutting for closed polygons — each pass doubles the vertex
 *  count and rounds corners. */
export function chaikinSmooth(poly: Vec2[], iterations: number): Vec2[] {
  let pts = poly;
  for (let it = 0; it < iterations; it++) {
    const next: Vec2[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      next.push(
        { x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y },
        { x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y },
      );
    }
    pts = next;
  }
  return pts;
}

const toPC = (rings: Vec2[][]): Polygon =>
  rings.map((r) => r.map((p) => [p.x, p.y] as [number, number]));
const outerRingsFromPC = (mp: MultiPolygon): Vec2[][] =>
  mp.map((poly) => poly[0].map(([x, y]) => ({ x, y })));

/** Union any number of simple polygons; returns the outer rings only. */
export function unionPolygons(polys: Vec2[][]): Vec2[][] {
  if (polys.length === 0) return [];
  try {
    const geoms = polys.map((p) => toPC([p]));
    const [first, ...rest] = geoms;
    return outerRingsFromPC(polygonClipping.union(first, ...rest));
  } catch {
    return polys;
  }
}

/** Uniformly offset a closed polygon outward by `d` (miter joins, clamped),
 *  then clean self-intersections. Returns one or more outer rings. */
export function offsetPolygon(poly: Vec2[], d: number): Vec2[][] {
  if (poly.length < 3) return [poly.slice()];
  if (d === 0) return [poly.slice()];
  const n = poly.length;

  const build = (sign: number): Vec2[] => {
    const out: Vec2[] = [];
    for (let i = 0; i < n; i++) {
      const prev = poly[(i - 1 + n) % n];
      const cur = poly[i];
      const next = poly[(i + 1) % n];
      let n1x = cur.y - prev.y;
      let n1y = prev.x - cur.x;
      let n2x = next.y - cur.y;
      let n2y = cur.x - next.x;
      const l1 = Math.hypot(n1x, n1y) || 1;
      const l2 = Math.hypot(n2x, n2y) || 1;
      n1x /= l1;
      n1y /= l1;
      n2x /= l2;
      n2y /= l2;
      let bx = n1x + n2x;
      let by = n1y + n2y;
      const bl = Math.hypot(bx, by);
      if (bl < 1e-6) {
        bx = n1x;
        by = n1y;
      } else {
        bx /= bl;
        by /= bl;
      }
      // miter length = d / cos(half angle), clamped so spikes stay bounded
      const cosHalf = Math.max(0.35, Math.sqrt(Math.max(0, (1 + (n1x * n2x + n1y * n2y)) / 2)));
      const k = (sign * d) / cosHalf;
      out.push({ x: cur.x + bx * k, y: cur.y + by * k });
    }
    return out;
  };

  const base = polygonArea(poly);
  let candidate = build(1);
  if (polygonArea(candidate) < base) candidate = build(-1);
  candidate = chaikinSmooth(candidate, 1);
  // self-union normalizes any self-intersections the miter offset introduced
  const cleaned = unionPolygons([candidate]);
  if (cleaned.length === 0) return [candidate];
  // keep the largest ring first
  return cleaned.sort((a, b) => polygonArea(b) - polygonArea(a));
}

export function circlePolygon(cx: number, cy: number, r: number, segments = 72): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

export function roundedRectPolygon(
  cx: number,
  cy: number,
  w: number,
  h: number,
  radius: number,
  segPerCorner = 8,
): Vec2[] {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const x1 = cx + w / 2;
  const y1 = cy + h / 2;
  const corners: Array<[number, number, number]> = [
    [x1 - r, y0 + r, -Math.PI / 2], // top-right
    [x1 - r, y1 - r, 0], // bottom-right
    [x0 + r, y1 - r, Math.PI / 2], // bottom-left
    [x0 + r, y0 + r, Math.PI], // top-left
  ];
  const pts: Vec2[] = [];
  for (const [ccx, ccy, start] of corners) {
    for (let i = 0; i <= segPerCorner; i++) {
      const a = start + (i / segPerCorner) * (Math.PI / 2);
      pts.push({ x: ccx + Math.cos(a) * r, y: ccy + Math.sin(a) * r });
    }
  }
  return pts;
}

/** Rotate/scale points about `origin`, then translate. Rotation in degrees. */
export function transformPoints(
  pts: Vec2[],
  origin: Vec2,
  scale: number,
  rotationDeg: number,
  translate: Vec2,
): Vec2[] {
  const a = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return pts.map((p) => {
    const dx = (p.x - origin.x) * scale;
    const dy = (p.y - origin.y) * scale;
    return { x: dx * cos - dy * sin + translate.x, y: dx * sin + dy * cos + translate.y };
  });
}

export function polysToPath(polys: Vec2[][], precision = 2): string {
  const f = (v: number) => v.toFixed(precision);
  return polys
    .filter((ring) => ring.length >= 3)
    .map(
      (ring) =>
        `M ${f(ring[0].x)} ${f(ring[0].y)} ` +
        ring
          .slice(1)
          .map((p) => `L ${f(p.x)} ${f(p.y)}`)
          .join(" ") +
        " Z",
    )
    .join(" ");
}

export function circlePath(cx: number, cy: number, r: number, precision = 2): string {
  const f = (v: number) => v.toFixed(precision);
  return (
    `M ${f(cx + r)} ${f(cy)} ` +
    `A ${f(r)} ${f(r)} 0 1 0 ${f(cx - r)} ${f(cy)} ` +
    `A ${f(r)} ${f(r)} 0 1 0 ${f(cx + r)} ${f(cy)} Z`
  );
}

import type { StreetLine } from "../api/fetchStreets";

/** Major roads get a wider stamp so the hierarchy reads in cast metal. */
function radiusFor(cls: string): number {
  return /^(motorway|trunk|primary)/.test(cls) ? 1 : 0;
}

/**
 * Rasterize OSM street polylines into a gridN×gridN 0/1 mask, aligned to the
 * SAME lat/lng sampling as the terrain and building rasters (row = lat,
 * col = lng, row 0 = south). Each segment is walked in half-cell steps so
 * diagonal roads leave no gaps.
 */
export function rasterizeStreets(
  streets: StreetLine[],
  lat: number,
  lng: number,
  areaKm: number,
  gridN: number,
): Float32Array {
  const field = new Float32Array(gridN * gridN);
  const dLat = areaKm / 111;
  const dLng = areaKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  const south = lat - dLat / 2;
  const west = lng - dLng / 2;
  const toRow = (la: number) => ((la - south) / dLat) * (gridN - 1);
  const toCol = (lo: number) => ((lo - west) / dLng) * (gridN - 1);

  const stamp = (r: number, c: number, rad: number) => {
    for (let dr = -rad; dr <= rad; dr++)
      for (let dc = -rad; dc <= rad; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < gridN && cc >= 0 && cc < gridN) field[rr * gridN + cc] = 1;
      }
  };

  for (const st of streets) {
    const rad = radiusFor(st.cls);
    for (let i = 1; i < st.pts.length; i++) {
      const r0 = toRow(st.pts[i - 1][0]), c0 = toCol(st.pts[i - 1][1]);
      const r1 = toRow(st.pts[i][0]), c1 = toCol(st.pts[i][1]);
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0)) * 2));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        stamp(Math.round(r0 + (r1 - r0) * t), Math.round(c0 + (c1 - c0) * t), rad);
      }
    }
  }
  return field;
}

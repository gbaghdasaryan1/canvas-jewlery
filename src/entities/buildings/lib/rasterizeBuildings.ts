import type { BuildingPolygon } from "../api/fetchBuildings";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Ray-casting point-in-polygon (x = lng, y = lat). */
function pointInRing(lat: number, lng: number, ring: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i][0],
      xi = ring[i][1];
    const yj = ring[j][0],
      xj = ring[j][1];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Rasterize building footprints into a gridN×gridN field of heights (metres),
 * aligned to the SAME lat/lng sampling the mountains uses (row = lat, col = lng,
 * row 0 = south). Each cell takes the tallest building covering its centre, so
 * the city's skyline can be added on top of the bare-earth mountains.
 */
export function rasterizeBuildings(
  buildings: BuildingPolygon[],
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

  for (const b of buildings) {
    // Limit the scan to the footprint's bounding box of grid cells.
    let mnLa = Infinity,
      mxLa = -Infinity,
      mnLo = Infinity,
      mxLo = -Infinity;
    for (const [la, lo] of b.ring) {
      if (la < mnLa) mnLa = la;
      if (la > mxLa) mxLa = la;
      if (lo < mnLo) mnLo = lo;
      if (lo > mxLo) mxLo = lo;
    }
    const r0 = clamp(Math.floor(((mnLa - south) / dLat) * (gridN - 1)), 0, gridN - 1);
    const r1 = clamp(Math.ceil(((mxLa - south) / dLat) * (gridN - 1)), 0, gridN - 1);
    const c0 = clamp(Math.floor(((mnLo - west) / dLng) * (gridN - 1)), 0, gridN - 1);
    const c1 = clamp(Math.ceil(((mxLo - west) / dLng) * (gridN - 1)), 0, gridN - 1);

    for (let r = r0; r <= r1; r++) {
      const cellLat = south + (dLat * r) / (gridN - 1);
      for (let c = c0; c <= c1; c++) {
        const cellLng = west + (dLng * c) / (gridN - 1);
        if (pointInRing(cellLat, cellLng, b.ring)) {
          const idx = r * gridN + c;
          if (b.height > field[idx]) field[idx] = b.height;
        }
      }
    }
  }
  return field;
}

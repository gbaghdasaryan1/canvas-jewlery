import { overpass } from "@/shared/lib/overpass";

export interface BuildingPolygon {
  /** outer ring as [lat, lng] pairs */
  ring: Array<[number, number]>;
  /** estimated height in metres (for subtle shading) */
  height: number;
}

/** Best-effort building height from OSM tags (metres). */
function estimateHeight(tags: Record<string, string> | undefined): number {
  if (!tags) return 6;
  if (tags.height) {
    const h = parseFloat(tags.height.replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(h) && h > 0) return h;
  }
  if (tags["building:levels"]) {
    const lv = parseFloat(tags["building:levels"]);
    if (!Number.isNaN(lv) && lv > 0) return lv * 3.2;
  }
  return 6;
}

/**
 * Fetch OSM building footprints around a point via the Overpass API, as
 * projection-ready polygons. CORS-enabled; throws on failure so callers can
 * degrade gracefully.
 */
export async function fetchBuildings(
  lat: number,
  lng: number,
  areaKm: number,
): Promise<BuildingPolygon[]> {
  const dLat = areaKm / 111;
  const dLng = areaKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  const s = lat - dLat / 2, n = lat + dLat / 2;
  const w = lng - dLng / 2, e = lng + dLng / 2;

  const query =
    `[out:json][timeout:25];` +
    `(way["building"](${s},${w},${n},${e}););` +
    `out geom;`;

  const json = await overpass(query);
  const out: BuildingPolygon[] = [];
  for (const el of json.elements ?? []) {
    if (el.type !== "way" || !el.geometry || el.geometry.length < 3) continue;
    out.push({
      ring: el.geometry.map((g) => [g.lat, g.lon] as [number, number]),
      height: estimateHeight(el.tags),
    });
  }
  return out;
}

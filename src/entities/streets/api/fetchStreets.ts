import { overpass } from "@/shared/lib/overpass";

export interface StreetLine {
  /** polyline as [lat, lng] pairs */
  pts: Array<[number, number]>;
  /** OSM highway class (motorway, primary, residential…) */
  cls: string;
}

/**
 * Fetch the OSM street network around a point via the Overpass API, as
 * projected-ready polylines. CORS-enabled; throws on failure so callers can
 * degrade gracefully.
 */
export async function fetchStreets(
  lat: number,
  lng: number,
  areaKm: number,
): Promise<StreetLine[]> {
  const dLat = areaKm / 111;
  const dLng = areaKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  const s = lat - dLat / 2, n = lat + dLat / 2;
  const w = lng - dLng / 2, e = lng + dLng / 2;

  // Drivable + walkable roads; skip footway/path noise for a clean map look.
  const query =
    `[out:json][timeout:25];` +
    `(way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|road)$"]` +
    `(${s},${w},${n},${e}););` +
    `out geom;`;

  const json = await overpass(query);
  const out: StreetLine[] = [];
  for (const el of json.elements ?? []) {
    if (el.type !== "way" || !el.geometry || el.geometry.length < 2) continue;
    out.push({
      pts: el.geometry.map((g) => [g.lat, g.lon] as [number, number]),
      cls: el.tags?.highway ?? "road",
    });
  }
  return out;
}

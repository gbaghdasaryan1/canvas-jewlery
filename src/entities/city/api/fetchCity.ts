import { fetchTileFeatures, type Bbox, type Ring } from "@/shared/lib/mapboxTiles";

export interface CityBuilding {
  ring: Array<[number, number]>; // [lat, lng]
  height: number; // metres
}

export interface CityRoad {
  pts: Array<[number, number]>; // [lat, lng]
  cls: string; // Mapbox road class
}

export interface CityData {
  buildings: CityBuilding[];
  roads: CityRoad[];
  water: Array<Array<[number, number]>>;
  green: Array<Array<[number, number]>>;
}

// [lng,lat] tile coords -> [lat,lng] used by the mesh builder.
const flip = (r: Ring): Array<[number, number]> => r.map(([lng, lat]) => [lat, lng]);

function buildingHeight(props: Record<string, string | number | boolean>): number {
  const h = Number(props.height);
  if (Number.isFinite(h) && h > 0) return h;
  const levels = Number(props.levels);
  if (Number.isFinite(levels) && levels > 0) return levels * 3.2;
  return 9; // sensible default for an untagged building
}

// Mapbox road classes worth showing on the plate (skip footway/path noise).
const ROAD_CLASSES = new Set([
  "motorway", "motorway_link", "trunk", "primary", "secondary",
  "tertiary", "street", "street_limited", "service", "link",
]);

const GREEN_CLASSES = new Set([
  "park", "grass", "wood", "scrub", "pitch", "cemetery", "garden", "national_park",
]);

/**
 * Fetch the data for a 3D mini-skyline around a point from Mapbox vector tiles:
 * building footprints with heights, the road network, plus water and green
 * areas. Requires VITE_MAPBOX_TOKEN.
 */
export async function fetchCity(lat: number, lng: number, areaKm: number): Promise<CityData> {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  if (!token) throw new Error("Mapbox token missing — set VITE_MAPBOX_TOKEN.");

  const dLat = areaKm / 111;
  const dLng = areaKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  const bbox: Bbox = [lng - dLng / 2, lat - dLat / 2, lng + dLng / 2, lat + dLat / 2];

  const f = await fetchTileFeatures(bbox, 15, token); // z15: building layer available

  const out: CityData = { buildings: [], roads: [], water: [], green: [] };

  for (const b of f.buildings) {
    if (b.props.underground === "true") continue;
    out.buildings.push({ ring: flip(b.ring), height: buildingHeight(b.props) });
  }
  for (const r of f.roads) {
    if (ROAD_CLASSES.has(String(r.props.class))) out.roads.push({ pts: flip(r.pts), cls: String(r.props.class) });
  }
  for (const w of f.water) out.water.push(flip(w.ring));
  for (const g of f.landuse) {
    if (GREEN_CLASSES.has(String(g.props.class))) out.green.push(flip(g.ring));
  }
  return out;
}

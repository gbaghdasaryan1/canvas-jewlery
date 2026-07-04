import Pbf from "pbf";
import { VectorTile } from "@mapbox/vector-tile";
import type { Feature } from "geojson";

const TILESET = "mapbox.mapbox-streets-v8";
const MAX_TILE_SPAN = 6; // cap tiles per axis so a huge window can't explode

export type Ring = Array<[number, number]>; // [lng, lat]
export interface TilePolygon { ring: Ring; props: Record<string, string | number | boolean>; }
export interface TileLine { pts: Ring; props: Record<string, string | number | boolean>; }

export interface TileFeatures {
  buildings: TilePolygon[];
  roads: TileLine[];
  water: TilePolygon[];
  landuse: TilePolygon[];
}

export type Bbox = [west: number, south: number, east: number, north: number];

const lngToTileX = (lng: number, z: number) => Math.floor(((lng + 180) / 360) * 2 ** z);
const latToTileY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

/**
 * Fetch and decode Mapbox vector tiles covering `bbox` at zoom `z`, returning
 * building/road/water/landuse features (coords as [lng, lat]). Features are
 * de-duplicated across the tile buffer by stable feature id.
 */
export async function fetchTileFeatures(bbox: Bbox, z: number, token: string): Promise<TileFeatures> {
  const [w, s, e, n] = bbox;
  const x0 = lngToTileX(w, z);
  const x1 = Math.min(lngToTileX(e, z), x0 + MAX_TILE_SPAN - 1);
  const y0 = latToTileY(n, z); // north = smaller y
  const y1 = Math.min(latToTileY(s, z), y0 + MAX_TILE_SPAN - 1);

  const out: TileFeatures = { buildings: [], roads: [], water: [], landuse: [] };
  const seen = new Set<string>();

  const pushPolys = (f: Feature, arr: TilePolygon[], key: string) => {
    const g = f.geometry;
    const rings: Ring[] =
      g.type === "Polygon" ? [g.coordinates[0] as Ring]
      : g.type === "MultiPolygon" ? g.coordinates.map((p) => p[0] as Ring)
      : [];
    if (!rings.length || seen.has(key)) return;
    seen.add(key);
    for (const ring of rings) if (ring.length >= 3) arr.push({ ring, props: f.properties ?? {} });
  };

  const pushLines = (f: Feature, arr: TileLine[], key: string) => {
    const g = f.geometry;
    const lines: Ring[] =
      g.type === "LineString" ? [g.coordinates as Ring]
      : g.type === "MultiLineString" ? (g.coordinates as Ring[])
      : [];
    if (!lines.length || seen.has(key)) return;
    seen.add(key);
    for (const line of lines) if (line.length >= 2) arr.push({ pts: line, props: f.properties ?? {} });
  };

  const jobs: Promise<void>[] = [];
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++) jobs.push(loadTile(x, y));
  await Promise.all(jobs);
  return out;

  async function loadTile(x: number, y: number): Promise<void> {
    const url = `https://api.mapbox.com/v4/${TILESET}/${z}/${x}/${y}.mvt?access_token=${token}`;
    const res = await fetch(url);
    if (res.status === 404) return; // empty tile — normal
    if (!res.ok) throw new Error(`Mapbox tile ${res.status}`);
    // @types for pbf and vector-tile are out of sync; runtime is compatible.
    const pbf = new Pbf(new Uint8Array(await res.arrayBuffer()));
    const tile = new VectorTile(pbf as unknown as ConstructorParameters<typeof VectorTile>[0]);

    const each = (name: string, fn: (f: Feature, id: string) => void) => {
      const layer = tile.layers[name];
      if (!layer) return;
      for (let i = 0; i < layer.length; i++) {
        const feat = layer.feature(i);
        fn(feat.toGeoJSON(x, y, z), `${name}:${feat.id ?? `${x}/${y}/${i}`}`);
      }
    };
    each("building", (f, id) => pushPolys(f, out.buildings, id));
    each("road", (f, id) => pushLines(f, out.roads, id));
    each("water", (f, id) => pushPolys(f, out.water, id));
    each("landuse", (f, id) => pushPolys(f, out.landuse, id));
  }
}

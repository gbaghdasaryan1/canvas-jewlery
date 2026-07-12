import { overpass } from "@/shared/lib/overpass";

export interface BuildingPolygon {
  /** outer ring as [lat, lng] pairs */
  ring: Array<[number, number]>;
  /** estimated (total) height in metres */
  height: number;
  /** metres above ground where this volume starts (building:part setbacks,
      skybridges, tower crowns) — 0/undefined for ground-based volumes */
  minHeight?: number;
  /** true for towers, statues, obelisks & monuments — extruding their
      footprint as a straight prism looks wrong, so renderers taper them */
  tower?: boolean;
}

/** Landmark spires: towers, statues, obelisks, monuments. Big statues are
    often just building=yes with a telling name (Statue of Liberty), hence
    the name heuristic. */
function isSpire(tags: Record<string, string> | undefined): boolean {
  if (!tags) return false;
  return (
    /^(tower|statue|obelisk|monument|cross)$/.test(tags["man_made"] ?? "") ||
    tags.building === "tower" ||
    !!tags["tower:type"] ||
    /^(monument|memorial)$/.test(tags["historic"] ?? "") ||
    tags["artwork_type"] === "statue" ||
    /statue/i.test(tags.name ?? "") ||
    /statue/i.test(tags["name:en"] ?? "")
  );
}

/** Best-effort building height from OSM tags (metres). */
function estimateHeight(tags: Record<string, string> | undefined, fallback = 6): number {
  if (!tags) return fallback;
  if (tags.height) {
    const h = parseFloat(tags.height.replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(h) && h > 0) return h;
  }
  if (tags["building:levels"]) {
    const lv = parseFloat(tags["building:levels"]);
    if (!Number.isNaN(lv) && lv > 0) return lv * 3.2;
  }
  return fallback;
}

/** building:part lower bound in metres (min_height / building:min_level). */
function estimateMinHeight(tags: Record<string, string> | undefined): number {
  if (!tags) return 0;
  if (tags.min_height) {
    const h = parseFloat(tags.min_height.replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(h) && h > 0) return h;
  }
  if (tags["building:min_level"]) {
    const lv = parseFloat(tags["building:min_level"]);
    if (!Number.isNaN(lv) && lv > 0) return lv * 3.2;
  }
  return 0;
}

/** Ray-casting point-in-ring (lat/lng space). */
function pointInRing(lat: number, lng: number, ring: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i];
    const [yj, xj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
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
  signal?: AbortSignal,
): Promise<BuildingPolygon[]> {
  const dLat = areaKm / 111;
  const dLng = areaKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  const s = lat - dLat / 2, n = lat + dLat / 2;
  const w = lng - dLng / 2, e = lng + dLng / 2;

  const bbox = `${s},${w},${n},${e}`;
  // Buildings, plus statue/monument WAYS (often untagged as buildings) and
  // statue/monument NODES (Mother Armenia, Christ the Redeemer are points —
  // they'd otherwise be missing from the piece entirely). Overpass dedupes
  // elements matched by several clauses.
  const query =
    `[out:json][timeout:25];(` +
    `way["building"](${bbox});` +
    `way["building:part"](${bbox});` +
    `way["man_made"~"^(statue|obelisk|monument|cross)$"](${bbox});` +
    `way["historic"~"^(monument|memorial)$"](${bbox});` +
    `node["historic"="monument"](${bbox});` +
    `node["man_made"~"^(statue|obelisk|monument)$"](${bbox});` +
    `);out geom;`;

  const json = await overpass(query, signal);
  const outlines: BuildingPolygon[] = [];
  const parts: BuildingPolygon[] = [];
  const points: BuildingPolygon[] = [];
  for (const el of json.elements ?? []) {
    if (el.type === "node" && el.lat != null && el.lon != null) {
      // Point monument: synthesize a ~10 m square footprint under a spire.
      const half = 5; // metres
      const dLa = half / 111320;
      const dLo = half / (111320 * Math.cos((el.lat * Math.PI) / 180) || 1);
      points.push({
        ring: [
          [el.lat - dLa, el.lon - dLo],
          [el.lat - dLa, el.lon + dLo],
          [el.lat + dLa, el.lon + dLo],
          [el.lat + dLa, el.lon - dLo],
        ],
        height: estimateHeight(el.tags, 25),
        tower: true,
      });
      continue;
    }
    if (el.type !== "way" || !el.geometry || el.geometry.length < 3) continue;
    const ring = el.geometry.map((g) => [g.lat, g.lon] as [number, number]);
    const isPart = !!el.tags?.["building:part"] && el.tags["building:part"] !== "no";
    if (isPart) {
      // Simple-3D-Buildings volume: what gives skyscrapers their real
      // massing (setbacks, crowns) — same data the Mapbox map extrudes.
      parts.push({
        ring,
        height: estimateHeight(el.tags),
        minHeight: estimateMinHeight(el.tags) || undefined,
        tower: false,
      });
    } else {
      outlines.push({
        ring,
        height: estimateHeight(el.tags),
        tower: isSpire(el.tags),
      });
    }
  }

  // Simple-3D-Buildings convention (also what the map does): where a building
  // is modelled with parts, render the parts and drop the umbrella outline —
  // otherwise the outline prism would swallow the detailed tower.
  let kept = outlines;
  if (parts.length) {
    const centroids = parts.map((p) => {
      let la = 0, lo = 0;
      for (const [a, b] of p.ring) { la += a; lo += b; }
      return [la / p.ring.length, lo / p.ring.length] as [number, number];
    });
    kept = outlines.filter(
      (o) => !centroids.some(([la, lo]) => pointInRing(la, lo, o.ring)),
    );
  }
  return [...kept, ...parts, ...points];
}

import type { TerrainGrid } from "../model/types";
import { proceduralTerrain } from "../lib/procedural";

/**
 * Terrain elevation.
 *
 * OpenStreetMap does not serve elevation data and we use no other provider, so
 * relief is generated procedurally — deterministic pseudo-terrain seeded by the
 * coordinate. Kept async so callers (React Query) don't need to change.
 */
export async function fetchElevation(
  lat: number,
  lng: number,
  _areaKm: number,
): Promise<TerrainGrid> {
  return proceduralTerrain(lat, lng);
}

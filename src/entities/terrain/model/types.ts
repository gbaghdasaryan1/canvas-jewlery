export type TerrainSource = "dem" | "demo";

export interface TerrainGrid {
  /** GRID×GRID elevations in metres, row-major (row = lat, col = lng). */
  data: Float32Array;
  min: number;
  max: number;
  source: TerrainSource;
}

/** Normalize a terrain grid to 0..1 for displacement. */
export function normalizeTerrain(t: TerrainGrid): Float32Array {
  const span = t.max - t.min || 1;
  const out = new Float32Array(t.data.length);
  for (let i = 0; i < out.length; i++) out[i] = (t.data[i] - t.min) / span;
  return out;
}

export type mountainsSource = "dem" | "demo";

export interface mountainsGrid {
  /** GRID×GRID elevations in metres, row-major (row = lat, col = lng). */
  data: Float32Array;
  min: number;
  max: number;
  source: mountainsSource;
}

/** Normalize a mountains grid to 0..1 for displacement. */
export function normalizemountains(t: mountainsGrid): Float32Array {
  const span = t.max - t.min || 1;
  const out = new Float32Array(t.data.length);
  for (let i = 0; i < out.length; i++) out[i] = (t.data[i] - t.min) / span;
  return out;
}

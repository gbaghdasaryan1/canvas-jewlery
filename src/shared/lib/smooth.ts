/**
 * Round off sharp ridges in a square N×N heightfield with a separable binomial
 * (1-2-1) blur (N inferred from the array length). Each iteration is one
 * Gaussian pass; edges clamp so the border isn't pulled inward. Returns a new
 * array; the input is left untouched.
 */
export function smoothGrid(src: Float32Array, iterations = 2): Float32Array {
  const N = Math.round(Math.sqrt(src.length));
  const cur = Float32Array.from(src);
  const tmp = new Float32Array(N * N);

  for (let it = 0; it < iterations; it++) {
    // Horizontal pass.
    for (let y = 0; y < N; y++) {
      const row = y * N;
      for (let x = 0; x < N; x++) {
        const xm = x > 0 ? x - 1 : x;
        const xp = x < N - 1 ? x + 1 : x;
        tmp[row + x] = (cur[row + xm] + 2 * cur[row + x] + cur[row + xp]) * 0.25;
      }
    }
    // Vertical pass.
    for (let y = 0; y < N; y++) {
      const ym = (y > 0 ? y - 1 : y) * N;
      const yp = (y < N - 1 ? y + 1 : y) * N;
      const row = y * N;
      for (let x = 0; x < N; x++) {
        cur[row + x] = (tmp[ym + x] + 2 * tmp[row + x] + tmp[yp + x]) * 0.25;
      }
    }
  }
  return cur;
}

export interface RingParams {
  /** inner radius in mm (from ring size) */
  innerRadius: number;
  /** base wall thickness in mm */
  thickness: number;
  /** max radial displacement of the mountains in mm */
  amp: number;
  /** band width in mm (along the finger axis) */
  bandWidth: number;
  circSteps: number;
  widthSteps: number;
  /** fraction of circumference used to ease the wrap seam (0..0.5) */
  seamBlend: number;
}

export interface SlabParams {
  /** plate size in mm along X (east–west) */
  width: number;
  /** plate size in mm along Z (north–south) */
  depth: number;
  /** solid base thickness in mm below the lowest mountains point */
  base: number;
  /** max relief height in mm above the base */
  amp: number;
  /** vertices per axis on the top surface */
  resX: number;
  resZ: number;
  /** Raise the perimeter frame wall. Defaults to true; rings pass false so the
      relief sits flush on the band with no bezel. */
  frame?: boolean;
}

export interface RingMeshData {
  positions: Float32Array;
  indices: Uint32Array;
}

/** Concatenate indexed meshes into one shell set (indices re-offset). */
export function mergeMeshData(...parts: RingMeshData[]): RingMeshData {
  const positions = new Float32Array(parts.reduce((n, p) => n + p.positions.length, 0));
  const indices = new Uint32Array(parts.reduce((n, p) => n + p.indices.length, 0));
  let vo = 0,
    io = 0;
  for (const p of parts) {
    positions.set(p.positions, vo * 3);
    for (let i = 0; i < p.indices.length; i++) indices[io + i] = p.indices[i] + vo;
    vo += p.positions.length / 3;
    io += p.indices.length;
  }
  return { positions, indices };
}

/** Raised frame wall around every plaque: band width in mm. */
export const FRAME_MM = 0.8;
/** Frame wall height in mm above the base — static, independent of relief. */
export const FRAME_HEIGHT_MM = 2.5;

/** US ring size -> inner radius in mm. */
export function ringSizeToInnerRadius(usSize: number): number {
  return (11.63 + 0.8128 * usSize) / 2;
}

/** Bilinear sample of a square N×N normalized heightmap (row-major).
    N is inferred from the array length, so callers can pass any resolution
    (55×55 for the live views, denser rasters for STL export). */
function sampleGrid(h: Float32Array, fu: number, fv: number): number {
  const N = Math.round(Math.sqrt(h.length));
  const x = Math.min(Math.max(fu, 0), 1) * (N - 1);
  const y = Math.min(Math.max(fv, 0), 1) * (N - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, N - 1);
  const y1 = Math.min(y0 + 1, N - 1);
  const tx = x - x0;
  const ty = y - y0;
  const a = h[y0 * N + x0];
  const b = h[y0 * N + x1];
  const c = h[y1 * N + x0];
  const d = h[y1 * N + x1];
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}

/**
 * Build a watertight ring band by wrapping a normalized mountains patch around
 * the finger. Circumference (u) goes around; band width (v) goes across.
 * Returns indexed geometry suitable for BufferGeometry and STL export.
 */
export function buildRingMesh(heightNorm: Float32Array, p: RingParams): RingMeshData {
  const C = p.circSteps;
  const W = p.widthSteps;
  const positions: number[] = [];
  const indices: number[] = [];

  // Displacement field across width (i: 0..W) and circumference (j: 0..C-1).
  // TEST: relief is sampled VERTICALLY — the circumference wraps the mountains's
  // v (vertical) axis and the band width spans its u (horizontal) axis. Swap the
  // two sampleGrid args back to (fu, i / W) to restore the horizontal wrap.
  const disp = new Float32Array((W + 1) * C);
  for (let j = 0; j < C; j++) {
    const fu = j / C;
    for (let i = 0; i <= W; i++) disp[i * C + j] = sampleGrid(heightNorm, i / W, fu);
  }

  // Ease the last seamBlend fraction back toward j=0 so the wrap closes cleanly.
  const blend = Math.max(1, Math.floor(C * p.seamBlend));
  for (let k = 0; k < blend; k++) {
    const j = C - blend + k;
    const t = (k + 1) / blend;
    const w = 0.5 - 0.5 * Math.cos(Math.PI * t);
    for (let i = 0; i <= W; i++) {
      const start = disp[i * C + 0];
      disp[i * C + j] = disp[i * C + j] + (start - disp[i * C + j]) * w;
    }
  }

  // Vertex index helper. Layer 0 = inner surface, layer 1 = outer surface.
  const idx = (layer: number, i: number, j: number): number =>
    layer * (W + 1) * C + i * C + (((j % C) + C) % C);

  for (let layer = 0; layer < 2; layer++) {
    for (let i = 0; i <= W; i++) {
      const axis = (i / W - 0.5) * p.bandWidth; // along finger
      for (let j = 0; j < C; j++) {
        const ang = (j / C) * Math.PI * 2;
        const r =
          layer === 0 ? p.innerRadius : p.innerRadius + p.thickness + p.amp * disp[i * C + j];
        // y is the finger axis so the ring stands nicely by default
        positions.push(Math.cos(ang) * r, axis, Math.sin(ang) * r);
      }
    }
  }

  // Outer surface
  for (let i = 0; i < W; i++)
    for (let j = 0; j < C; j++) {
      const a = idx(1, i, j),
        b = idx(1, i, j + 1),
        c = idx(1, i + 1, j),
        d = idx(1, i + 1, j + 1);
      indices.push(a, c, b, b, c, d);
    }
  // Inner surface (reversed winding -> faces inward)
  for (let i = 0; i < W; i++)
    for (let j = 0; j < C; j++) {
      const a = idx(0, i, j),
        b = idx(0, i, j + 1),
        c = idx(0, i + 1, j),
        d = idx(0, i + 1, j + 1);
      indices.push(a, b, c, b, d, c);
    }
  // Rim at i=0
  for (let j = 0; j < C; j++) {
    const oi = idx(1, 0, j),
      oj = idx(1, 0, j + 1),
      ii = idx(0, 0, j),
      ij = idx(0, 0, j + 1);
    indices.push(ii, oi, oj, ii, oj, ij);
  }
  // Rim at i=W (reversed)
  for (let j = 0; j < C; j++) {
    const oi = idx(1, W, j),
      oj = idx(1, W, j + 1),
      ii = idx(0, W, j),
      ij = idx(0, W, j + 1);
    indices.push(ii, oj, oi, ii, ij, oj);
  }

  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}

/**
 * Build a watertight rectangular relief plaque from a normalized mountains patch.
 * The top face is displaced by the mountains; a flat base and four side walls
 * close it into a solid. X is east–west, Z is north–south, Y is height.
 * Returns indexed geometry suitable for BufferGeometry and STL export.
 */
export function buildSlabMesh(heightNorm: Float32Array, p: SlabParams): RingMeshData {
  const NX = p.resX,
    NZ = p.resZ; // cells per axis
  const VX = NX + 1,
    VZ = NZ + 1; // vertices per axis
  const positions: number[] = [];
  const indices: number[] = [];

  const top = (i: number, j: number) => j * VX + i;
  const botOffset = VX * VZ;
  const bot = (i: number, j: number) => botOffset + j * VX + i;

  // Top surface: mountains-displaced. Row j -> north–south (v), col i -> east–west (u).
  // Vertices within FRAME_MM of an edge rise to FRAME_HEIGHT_MM — the frame wall.
  for (let j = 0; j < VZ; j++) {
    const z = (j / NZ - 0.5) * p.depth;
    for (let i = 0; i < VX; i++) {
      const x = (i / NX - 0.5) * p.width;
      const edge = Math.min(p.width / 2 - Math.abs(x), p.depth / 2 - Math.abs(z));
      const y =
        p.frame !== false && edge <= FRAME_MM
          ? p.base + FRAME_HEIGHT_MM
          : p.base + p.amp * sampleGrid(heightNorm, i / NX, j / NZ);
      positions.push(x, y, z);
    }
  }
  // Bottom surface: flat at y = 0.
  for (let j = 0; j < VZ; j++) {
    const z = (j / NZ - 0.5) * p.depth;
    for (let i = 0; i < VX; i++) {
      const x = (i / NX - 0.5) * p.width;
      positions.push(x, 0, z);
    }
  }

  // Top faces (outward normal +Y).
  for (let j = 0; j < NZ; j++)
    for (let i = 0; i < NX; i++) {
      const a = top(i, j),
        b = top(i + 1, j),
        c = top(i, j + 1),
        d = top(i + 1, j + 1);
      indices.push(a, c, b, b, c, d);
    }
  // Bottom faces (outward normal -Y).
  for (let j = 0; j < NZ; j++)
    for (let i = 0; i < NX; i++) {
      const a = bot(i, j),
        b = bot(i + 1, j),
        c = bot(i, j + 1),
        d = bot(i + 1, j + 1);
      indices.push(a, b, c, b, d, c);
    }
  // Front wall (z min, -Z) and back wall (z max, +Z).
  for (let i = 0; i < NX; i++) {
    const tf0 = top(i, 0),
      tf1 = top(i + 1, 0),
      bf0 = bot(i, 0),
      bf1 = bot(i + 1, 0);
    indices.push(tf0, tf1, bf0, tf1, bf1, bf0);
    const tb0 = top(i, NZ),
      tb1 = top(i + 1, NZ),
      bb0 = bot(i, NZ),
      bb1 = bot(i + 1, NZ);
    indices.push(tb0, bb0, tb1, tb1, bb0, bb1);
  }
  // Left wall (x min, -X) and right wall (x max, +X).
  for (let j = 0; j < NZ; j++) {
    const tl0 = top(0, j),
      tl1 = top(0, j + 1),
      bl0 = bot(0, j),
      bl1 = bot(0, j + 1);
    indices.push(tl0, bl0, tl1, tl1, bl0, bl1);
    const tr0 = top(NX, j),
      tr1 = top(NX, j + 1),
      br0 = bot(NX, j),
      br1 = bot(NX, j + 1);
    indices.push(tr0, tr1, br0, tr1, br1, br0);
  }

  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}

/** Normalized heart outline (fits a unit box, centred on origin) at angle step. */
export function heartBoundary(steps: number): Array<{ x: number; z: number }> {
  const raw: Array<{ x: number; y: number }> = [];
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (let a = 0; a < steps; a++) {
    const t = (a / steps) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    raw.push({ x, y });
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const sx = maxX - minX,
    sy = maxY - minY;
  // Normalize to [-0.5, 0.5]; flip Y so the lobes point toward +Z (back).
  return raw.map(({ x, y }) => ({
    x: (x - minX) / sx - 0.5,
    z: 0.5 - (y - minY) / sy,
  }));
}

/** Normalized circular outline (radius 0.5, centred on origin). */
export function circleBoundary(steps: number): Array<{ x: number; z: number }> {
  const out: Array<{ x: number; z: number }> = [];
  for (let a = 0; a < steps; a++) {
    const t = (a / steps) * Math.PI * 2;
    out.push({ x: 0.5 * Math.cos(t), z: 0.5 * Math.sin(t) });
  }
  return out;
}

/**
 * Normalized octagon outline (fits [-0.5, 0.5], corners chamfered by fraction
 * `k` of the side — 0.21 ≈ a regular octagon), sampled counterclockwise to
 * `steps` points so the relief fan has enough angular resolution. Matches the
 * signet ring's flat plate top.
 */
export function octagonBoundary(steps = 160, k = 0.21): Array<{ x: number; z: number }> {
  const c: Array<[number, number]> = [
    [0.5 - k, -0.5],
    [0.5, -0.5 + k],
    [0.5, 0.5 - k],
    [0.5 - k, 0.5],
    [-0.5 + k, 0.5],
    [-0.5, 0.5 - k],
    [-0.5, -0.5 + k],
    [-0.5 + k, -0.5],
  ];
  const out: Array<{ x: number; z: number }> = [];
  const per = Math.max(1, Math.round(steps / 8));
  for (let i = 0; i < 8; i++) {
    const a = c[i],
      b = c[(i + 1) % 8];
    for (let j = 0; j < per; j++) {
      const t = j / per;
      out.push({ x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t });
    }
  }
  return out;
}

/**
 * Build a watertight flat relief plaque whose outline is given by `outline`
 * (normalized to [-0.5, 0.5], any star-shaped closed loop). The top face is
 * mountains-displaced and triangulated as a fan from the centroid out to the
 * outline; a flat base and a wall following the outline close it into a solid.
 */
export function buildFanPlaque(
  heightNorm: Float32Array,
  p: SlabParams,
  outline: Array<{ x: number; z: number }>,
): RingMeshData {
  const A = outline.length; // outline segments
  const R = Math.max(24, Math.floor(p.resZ / 2)); // radial rings
  const positions: number[] = [];
  const indices: number[] = [];

  // Star centre = mean of the outline.
  let cx = 0,
    cz = 0;
  for (const pt of outline) {
    cx += pt.x;
    cz += pt.z;
  }
  cx /= A;
  cz /= A;

  // Distance (mm) from a point to the outline — vertices within FRAME_MM of
  // the boundary rise to FRAME_HEIGHT_MM, forming the frame wall.
  const outMm = outline.map((q) => ({ x: q.x * p.width, z: q.z * p.depth }));
  const distToOutline = (px: number, pz: number): number => {
    let best = Infinity;
    for (let i = 0; i < outMm.length; i++) {
      const a = outMm[i],
        b = outMm[(i + 1) % outMm.length];
      const dx = b.x - a.x,
        dz = b.z - a.z;
      const t = Math.max(
        0,
        Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / (dx * dx + dz * dz || 1)),
      );
      const d = Math.hypot(a.x + dx * t - px, a.z + dz * t - pz);
      if (d < best) best = d;
    }
    return best;
  };

  const yOf = (nx: number, nz: number) =>
    p.frame !== false && distToOutline(nx * p.width, nz * p.depth) <= FRAME_MM
      ? p.base + FRAME_HEIGHT_MM
      : p.base + p.amp * sampleGrid(heightNorm, nx + 0.5, nz + 0.5);

  // Vertex layout: [topCentre, top rings(1..R)×A, botCentre, bot rings(1..R)×A].
  const topRing = (k: number, a: number) => 1 + (k - 1) * A + a;
  const topCount = 1 + R * A;
  const botCentre = topCount;
  const botRing = (k: number, a: number) => botCentre + 1 + (k - 1) * A + a;

  // Top centre, then top rings.
  positions.push(cx * p.width, yOf(cx, cz), cz * p.depth);
  for (let k = 1; k <= R; k++) {
    const f = k / R;
    for (let a = 0; a < A; a++) {
      const nx = cx + (outline[a].x - cx) * f;
      const nz = cz + (outline[a].z - cz) * f;
      positions.push(nx * p.width, yOf(nx, nz), nz * p.depth);
    }
  }
  // Bottom centre, then bottom rings (flat at y = 0).
  positions.push(cx * p.width, 0, cz * p.depth);
  for (let k = 1; k <= R; k++) {
    const f = k / R;
    for (let a = 0; a < A; a++) {
      const nx = cx + (outline[a].x - cx) * f;
      const nz = cz + (outline[a].z - cz) * f;
      positions.push(nx * p.width, 0, nz * p.depth);
    }
  }

  // Top inner fan (centre -> ring 1), outward normal +Y.
  for (let a = 0; a < A; a++) {
    const a2 = (a + 1) % A;
    indices.push(0, topRing(1, a2), topRing(1, a));
  }
  // Top rings.
  for (let k = 1; k < R; k++)
    for (let a = 0; a < A; a++) {
      const a2 = (a + 1) % A;
      const p0 = topRing(k, a),
        p1 = topRing(k, a2),
        p2 = topRing(k + 1, a),
        p3 = topRing(k + 1, a2);
      indices.push(p0, p1, p2, p1, p3, p2);
    }
  // Bottom inner fan (reversed -> normal -Y).
  for (let a = 0; a < A; a++) {
    const a2 = (a + 1) % A;
    indices.push(botCentre, botRing(1, a), botRing(1, a2));
  }
  // Bottom rings (reversed).
  for (let k = 1; k < R; k++)
    for (let a = 0; a < A; a++) {
      const a2 = (a + 1) % A;
      const p0 = botRing(k, a),
        p1 = botRing(k, a2),
        p2 = botRing(k + 1, a),
        p3 = botRing(k + 1, a2);
      indices.push(p0, p2, p1, p1, p2, p3);
    }
  // Outer wall (top ring R -> bottom ring R). Both outlines run
  // counterclockwise in the x–z plane, so this winding faces outward —
  // the reverse order faces the wall inward and it gets backface-culled.
  for (let a = 0; a < A; a++) {
    const a2 = (a + 1) % A;
    const t0 = topRing(R, a),
      t1 = topRing(R, a2),
      b0 = botRing(R, a),
      b1 = botRing(R, a2);
    indices.push(t0, t1, b0, t1, b1, b0);
  }

  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}

/** Heart-shaped relief plaque. */
export function buildHeartMesh(heightNorm: Float32Array, p: SlabParams): RingMeshData {
  return buildFanPlaque(heightNorm, p, heartBoundary(Math.max(120, p.resX * 2)));
}

/** Round (disc) relief plaque. */
export function buildCircleMesh(heightNorm: Float32Array, p: SlabParams): RingMeshData {
  return buildFanPlaque(heightNorm, p, circleBoundary(Math.max(120, p.resX * 2)));
}

/** Flat shank proportions relative to the plaque side (mm). Shared by the
    viewer and the exported solid so preview and print stay in sync. */
export const ringBandDims = (width: number) => ({
  innerR: width * 0.48,
  wall: width * 0.07,
  bandWidth: width * 0.21,
});

/**
 * How far the shank's crest is raised INTO the plaque base (mm). Seated exactly
 * at the base the band only touches along a tangent line, so it reads as a
 * circle hanging off the plate; sinking it a little fuses the two into one
 * piece. Capped at 60% of the plate thickness so it never pokes through the
 * relief on a thin plate. Shared by both viewers and the exported solid.
 */
export const ringBandSink = (width: number, baseThickness: number) =>
  Math.min(width * 0.05, baseThickness * 0.6);

export interface RingBandParams {
  /** inner radius of the finger hole, in mm */
  innerR: number;
  /** radial wall thickness (outer − inner), in mm */
  wall: number;
  /** band width along the finger axis (Z), in mm */
  bandWidth: number;
  /** angular segments around the band */
  steps?: number;
}

/**
 * A plain flat wedding-style band: a rectangular cross-section (radial `wall` ×
 * axial `bandWidth`) swept around the finger. The band circle lies in the X–Y
 * plane with the finger axis along +Z, so its top crest (max +Y) runs along Z —
 * a relief plaque set at y = 0 rests flush on that crest. Watertight indexed
 * mesh, matching the rest of the app's builders. Used as the ring's shank in the
 * viewer and merged into the exported solid.
 *
 * Each of the four faces (outer / inner cylinder walls + the two flat sides)
 * gets its OWN ring of vertices, so `computeVertexNormals` keeps the 90° corner
 * edges crisp — the band reads as a flat plate, not a rounded tube — while each
 * face still shades smoothly around the circumference.
 */
export function buildRingBandMesh({
  innerR,
  wall,
  bandWidth,
  steps = 128,
}: RingBandParams): RingMeshData {
  const outerR = innerR + wall;
  const hw = bandWidth / 2;
  // Closed rectangular cross-section in (r, z), counterclockwise.
  const cs: Array<[number, number]> = [
    [innerR, -hw],
    [outerR, -hw],
    [outerR, hw],
    [innerR, hw],
  ];
  const M = cs.length;
  const positions: number[] = [];
  const indices: number[] = [];
  // One face per cross-section edge: a strip between the ring at corner k and
  // the ring at corner k+1, each with a dedicated (un-shared) vertex loop.
  for (let k = 0; k < M; k++) {
    const [ra, za] = cs[k];
    const [rb, zb] = cs[(k + 1) % M];
    const base = positions.length / 3;
    for (let s = 0; s < steps; s++) {
      const ang = (s / steps) * Math.PI * 2;
      const c = Math.cos(ang),
        sn = Math.sin(ang);
      positions.push(c * ra, sn * ra, za); // ring A (corner k)
    }
    for (let s = 0; s < steps; s++) {
      const ang = (s / steps) * Math.PI * 2;
      const c = Math.cos(ang),
        sn = Math.sin(ang);
      positions.push(c * rb, sn * rb, zb); // ring B (corner k+1)
    }
    const rA = (s: number) => base + (s % steps);
    const rB = (s: number) => base + steps + (s % steps);
    for (let s = 0; s < steps; s++) {
      const s2 = (s + 1) % steps;
      indices.push(rA(s), rA(s2), rB(s), rB(s), rA(s2), rB(s2));
    }
  }
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}

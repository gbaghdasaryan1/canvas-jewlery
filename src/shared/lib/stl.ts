import type { RingMeshData } from "./ringGeometry";

/** Serialize indexed geometry to a binary STL (recomputed face normals). */
export function buildBinarySTL({ positions, indices }: RingMeshData): ArrayBuffer {
  const triCount = indices.length / 3;
  const buf = new ArrayBuffer(84 + triCount * 50);
  const dv = new DataView(buf);
  dv.setUint32(80, triCount, true);

  let o = 84;
  const vx = (k: number): [number, number, number] => [
    positions[k * 3],
    positions[k * 3 + 1],
    positions[k * 3 + 2],
  ];

  for (let t = 0; t < triCount; t++) {
    const A = vx(indices[t * 3]);
    const B = vx(indices[t * 3 + 1]);
    const C = vx(indices[t * 3 + 2]);
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
    const wx = C[0] - A[0], wy = C[1] - A[1], wz = C[2] - A[2];
    let nx = uy * wz - uz * wy;
    let ny = uz * wx - ux * wz;
    let nz = ux * wy - uy * wx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;

    dv.setFloat32(o, nx, true); dv.setFloat32(o + 4, ny, true); dv.setFloat32(o + 8, nz, true);
    dv.setFloat32(o + 12, A[0], true); dv.setFloat32(o + 16, A[1], true); dv.setFloat32(o + 20, A[2], true);
    dv.setFloat32(o + 24, B[0], true); dv.setFloat32(o + 28, B[1], true); dv.setFloat32(o + 32, B[2], true);
    dv.setFloat32(o + 36, C[0], true); dv.setFloat32(o + 40, C[1], true); dv.setFloat32(o + 44, C[2], true);
    dv.setUint16(o + 48, 0, true);
    o += 50;
  }
  return buf;
}

/** Wrap indexed geometry in a binary-STL Blob (e.g. to attach to an order). */
export function buildStlBlob(data: RingMeshData): Blob {
  return new Blob([buildBinarySTL(data)], { type: "model/stl" });
}

/** Trigger a browser download of an STL blob. */
export function downloadSTL(data: RingMeshData, filename: string): void {
  const blob = buildStlBlob(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

import * as THREE from "three";
import { downloadUrl } from "./exporters";

/** Serialize any THREE geometries (indexed or not) into one binary STL.
 *  Same wire format as shared/lib/stl.buildBinarySTL, but source-agnostic so
 *  ExtrudeGeometry (non-indexed) and parsed uploads both work. */
export function buildBinarySTLFromGeometries(geometries: THREE.BufferGeometry[]): ArrayBuffer {
  let triCount = 0;
  for (const g of geometries) {
    triCount += (g.index ? g.index.count : g.attributes.position.count) / 3;
  }

  const buf = new ArrayBuffer(84 + triCount * 50);
  const dv = new DataView(buf);
  dv.setUint32(80, triCount, true);

  let o = 84;
  for (const g of geometries) {
    const pos = g.attributes.position as THREE.BufferAttribute;
    const index = g.index;
    const faces = (index ? index.count : pos.count) / 3;
    const vx = (f: number, corner: number): [number, number, number] => {
      const i = index ? index.getX(f * 3 + corner) : f * 3 + corner;
      return [pos.getX(i), pos.getY(i), pos.getZ(i)];
    };
    for (let f = 0; f < faces; f++) {
      const A = vx(f, 0);
      const B = vx(f, 1);
      const C = vx(f, 2);
      const ux = B[0] - A[0],
        uy = B[1] - A[1],
        uz = B[2] - A[2];
      const wx = C[0] - A[0],
        wy = C[1] - A[1],
        wz = C[2] - A[2];
      let nx = uy * wz - uz * wy;
      let ny = uz * wx - ux * wz;
      let nz = ux * wy - uy * wx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;

      dv.setFloat32(o, nx, true);
      dv.setFloat32(o + 4, ny, true);
      dv.setFloat32(o + 8, nz, true);
      dv.setFloat32(o + 12, A[0], true);
      dv.setFloat32(o + 16, A[1], true);
      dv.setFloat32(o + 20, A[2], true);
      dv.setFloat32(o + 24, B[0], true);
      dv.setFloat32(o + 28, B[1], true);
      dv.setFloat32(o + 32, B[2], true);
      dv.setFloat32(o + 36, C[0], true);
      dv.setFloat32(o + 40, C[1], true);
      dv.setFloat32(o + 44, C[2], true);
      dv.setUint16(o + 48, 0, true);
      o += 50;
    }
  }
  return buf;
}

export function downloadGeometrySTL(geometries: THREE.BufferGeometry[], fileName: string): void {
  const blob = new Blob([buildBinarySTLFromGeometries(geometries)], { type: "model/stl" });
  const url = URL.createObjectURL(blob);
  downloadUrl(fileName, url);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

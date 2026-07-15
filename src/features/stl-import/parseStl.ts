import * as THREE from "three";

/** Parse an STL file (binary or ASCII) into a THREE.BufferGeometry.
 *  Self-contained on purpose — no loader dependency. Binary is detected by
 *  the exact size formula (84 + 50·n bytes); everything else is tried as
 *  ASCII. Throws on files that are neither. */
export function parseSTL(buffer: ArrayBuffer): THREE.BufferGeometry {
  if (isBinary(buffer)) return parseBinary(buffer);
  return parseASCII(new TextDecoder().decode(buffer));
}

function isBinary(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 84) return false;
  const triCount = new DataView(buffer).getUint32(80, true);
  return buffer.byteLength === 84 + triCount * 50;
}

function parseBinary(buffer: ArrayBuffer): THREE.BufferGeometry {
  const dv = new DataView(buffer);
  const triCount = dv.getUint32(80, true);
  const positions = new Float32Array(triCount * 9);
  let o = 84;
  for (let t = 0; t < triCount; t++) {
    o += 12; // skip stored normal — recomputed below
    for (let v = 0; v < 9; v++) {
      positions[t * 9 + v] = dv.getFloat32(o, true);
      o += 4;
    }
    o += 2; // attribute byte count
  }
  return toGeometry(positions);
}

function parseASCII(text: string): THREE.BufferGeometry {
  const coords: number[] = [];
  const re = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    coords.push(Number(m[1]), Number(m[2]), Number(m[3]));
  }
  if (coords.length === 0 || coords.length % 9 !== 0) {
    throw new Error("Not a valid STL file");
  }
  return toGeometry(new Float32Array(coords));
}

function toGeometry(positions: Float32Array): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  return geo;
}

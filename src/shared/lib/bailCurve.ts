import * as THREE from "three";
import { FRAME_HEIGHT_MM, type RingMeshData } from "./ringGeometry";

/**
 * Closed teardrop path in the horizontal (XZ) plane — pointed tip at +x,
 * round end at −x, total length 2r. Sweep a tube along it (TubeGeometry,
 * closed) to get the water-drop pendant bail. Yaw the mesh so the tip aims
 * at the piece: rotation.y = atan2(oz, -ox) for outward direction (ox, oz).
 */
export class DropBailCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private readonly r: number) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const a = t * Math.PI * 2;
    const s = Math.sin(a / 2);
    return target.set(Math.cos(a) * this.r, 0, Math.sin(a) * s * s * this.r * 1.15);
  }
}

export interface BailMeshParams {
  /** Bail anchor in the normalized [-0.5, 0.5] plane (see hangAnchor). */
  hang: { x: number; z: number };
  /** Plate size in mm along X / Z. */
  width: number;
  depth: number;
  /** Plate base thickness in mm (the exported plate's bottom is y = 0). */
  base: number;
  /** Frame-wall height above the base, in mm. The bail centres on the wall at
      (base + frameHeightMm) / 2. Defaults to the relief plaque's fixed frame;
      the skyline passes its relief depth so the loop tracks the shorter wall. */
  frameHeightMm?: number;
  hangSize?: number;
  /** Yaw offset in degrees, added atop the outward-facing angle. */
  hangRotation?: number;
  /** Roll the loop upright for chain threading (the Chain toggle). */
  hangHorizontal?: boolean;
}

/**
 * The bail as a closed tube solid in the exported mesh's frame — the exact
 * loop the viewers preview (same size, placement, and YXZ rotation), so the
 * downloaded STL keeps the hang loop. The tip overlaps into the plate wall;
 * the result is a standard multi-shell STL (slicers/casting prep union it).
 */
export function buildBailMesh({
  hang,
  width,
  depth,
  base,
  frameHeightMm = FRAME_HEIGHT_MM,
  hangSize = 1,
  hangRotation = 0,
  hangHorizontal = false,
}: BailMeshParams): RingMeshData {
  const r = width * 0.095 * hangSize;
  const outLen = Math.hypot(hang.x, hang.z) || 1;
  const ox = hang.x / outLen;
  const oz = hang.z / outLen;
  const geo = new THREE.TubeGeometry(new DropBailCurve(r), 48, r * 0.2, 10, true);
  const m = new THREE.Matrix4().makeRotationFromEuler(
    // YXZ: roll upright around the tip axis first, then yaw outward — same
    // chain-ready orientation as the viewers.
    new THREE.Euler(
      hangHorizontal ? Math.PI / 2 : 0,
      Math.atan2(oz, -ox) + (hangRotation * Math.PI) / 180,
      0,
      "YXZ",
    ),
  );
  m.setPosition(
    hang.x * width + ox * r * 0.75,
    (base + frameHeightMm) / 2,
    hang.z * depth + oz * r * 0.75,
  );
  geo.applyMatrix4(m);
  const positions = Float32Array.from(geo.getAttribute("position").array as Float32Array);
  const indices = Uint32Array.from(geo.getIndex()!.array);
  geo.dispose();
  return { positions, indices };
}

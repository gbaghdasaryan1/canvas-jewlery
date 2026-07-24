import {
  buildShapeMesh,
  hangAnchors,
  isRing,
  toShapeParams,
  type HangPlace,
  type JewelryType,
  type Shape,
} from "@/entities/ring/model/types";
import {
  buildRingBandMesh,
  ringBandDims,
  ringBandSink,
  mergeMeshData,
  type RingMeshData,
} from "@/shared/lib/ringGeometry";
import { rotateHeightField } from "@/shared/lib/heightField";
import { buildBailMesh } from "@/shared/lib/bailCurve";

/** Rotate a mesh's positions about the vertical (Y) axis, in place. */
function yawInPlace(mesh: RingMeshData, degrees: number): void {
  const rad = (degrees * Math.PI) / 180;
  const c = Math.cos(rad),
    s = Math.sin(rad);
  const pos = mesh.positions;
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i],
      z = pos[i + 2];
    pos[i] = x * c + z * s;
    pos[i + 2] = -x * s + z * c;
  }
}

/** Everything needed to reproduce the exact solid that gets written to STL. */
export interface ExportMeshInput {
  shape: Shape;
  /** Composed 0..1 heightfield — the relief the plaque is displaced by. */
  heightNorm: Float32Array | null;
  width: number;
  relief: number;
  thickness: number;
  jewelryType: JewelryType;
  hangPlace: HangPlace;
  hangSize: number;
  hangRotation: number;
  hangHorizontal: boolean;
  /** Ring only — yaw of the plaque on the band, in degrees. */
  ringRotation: number;
  /** Optional mesh built on demand (e.g. the skyline's vector city mesh), used
      instead of the heightfield relief so the file matches the canvas exactly. */
  exportMesh?: () => RingMeshData | null;
}

/**
 * Build the watertight solid exported to STL: the relief plaque (or the
 * supplied vector mesh) plus, for pendants, the hang loop merged in. Both the
 * Download button and the 3D print preview call this, so what you see is
 * exactly what you download.
 */
export function buildExportMesh(input: ExportMeshInput): RingMeshData | null {
  const {
    shape,
    heightNorm,
    width,
    relief,
    thickness,
    jewelryType,
    hangPlace,
    hangSize,
    hangRotation,
    hangHorizontal,
    ringRotation,
    exportMesh,
  } = input;

  const usingExportMesh = !!exportMesh;

  // Both ring types drop the bezel frame so the relief sits flush on the shank.
  const framed = !isRing(jewelryType);
  // Orientation: rotate the relief field (not the mesh) so the frame + outline
  // stay put and only the inner design turns. Rings have no frame and yaw the
  // whole plaque below instead, so they keep the field unrotated here.
  const field =
    heightNorm && !isRing(jewelryType) ? rotateHeightField(heightNorm, ringRotation) : heightNorm;
  let mesh =
    exportMesh?.() ??
    (field
      ? buildShapeMesh(
          shape,
          field,
          toShapeParams(shape, { width, relief, thickness }, undefined, framed),
        )
      : null);
  if (!mesh) return null;

  // Ring: fuse a flat shank band beneath the plate. Both the plaque and the
  // skyline city mesh have their base at y = 0, so the band drops by its outer
  // radius to seat the piece on its crest. No bail. The plaque yaws on a fixed
  // band (matching RingViewer); the skyline keeps its map fixed and yaws the
  // band instead (matching CityViewer), so preview and STL agree either way.
  if (isRing(jewelryType)) {
    const dims = ringBandDims(width);
    const band = buildRingBandMesh(dims);
    // Raise the crest into the plate by `sink` so the two shells overlap and the
    // cast reads as one piece, matching both viewers.
    const dropY = dims.innerR + dims.wall - ringBandSink(width, Math.max(0.5, thickness));
    for (let i = 1; i < band.positions.length; i += 3) band.positions[i] -= dropY;
    if (usingExportMesh) {
      yawInPlace(band, -ringRotation);
    } else {
      yawInPlace(mesh, ringRotation);
    }
    return mergeMeshData(mesh, band);
  }

  // Pendant → one bail at the chosen point; bracelet → two parallel bails
  // (left + right) so it links into a chain on both sides. Ring → handled above.
  for (const hang of hangAnchors(shape, jewelryType, hangPlace)) {
    mesh = mergeMeshData(
      mesh,
      buildBailMesh({
        hang,
        width,
        depth: width,
        base: Math.max(0.5, thickness),
        // The skyline's vector mesh raises its frame to the relief depth (base +
        // relief), not the relief plaque's fixed frame — centre the bail on that
        // wall so it doesn't float above a shallow (e.g. streets) frame.
        frameHeightMm: exportMesh ? relief : undefined,
        hangSize,
        hangRotation,
        hangHorizontal,
      }),
    );
  }
  return mesh;
}

import {
  buildShapeMesh,
  hangAnchor,
  toShapeParams,
  type HangPlace,
  type JewelryType,
  type Shape,
} from "@/entities/ring/model/types";
import { mergeMeshData, type RingMeshData } from "@/shared/lib/ringGeometry";
import { buildBailMesh } from "@/shared/lib/bailCurve";

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
    shape, heightNorm, width, relief, thickness,
    jewelryType, hangPlace, hangSize, hangRotation, hangHorizontal, exportMesh,
  } = input;

  let mesh =
    exportMesh?.() ??
    (heightNorm
      ? buildShapeMesh(shape, heightNorm, toShapeParams(shape, { width, relief, thickness }))
      : null);
  if (!mesh) return null;

  if (jewelryType === "pendant") {
    mesh = mergeMeshData(mesh, buildBailMesh({
      hang: hangAnchor(shape, hangPlace),
      width,
      depth: width,
      base: Math.max(0.5, thickness),
      hangSize,
      hangRotation,
      hangHorizontal,
    }));
  }
  return mesh;
}

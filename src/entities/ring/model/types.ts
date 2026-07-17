import { GRID } from "@/shared/config/presets";
import {
  buildCircleMesh,
  buildHeartMesh,
  buildSlabMesh,
  circleBoundary,
  heartBoundary,
  type RingMeshData,
  type SlabParams,
} from "@/shared/lib/ringGeometry";

export type Metal = "gold" | "silver" | "platinum";

/** The physical form the mountains is rendered into. */
export type Shape = "rectangle" | "heart" | "circle";

/** What the cast piece is worn/mounted as. */
export type JewelryType = "pendant" | "ring" | "bracelet";
export const JEWELRY_TYPES: JewelryType[] = ["pendant", "ring", "bracelet"];

/** Where the bail/loop attaches on a pendant — every side and every corner. */
export type HangPlace =
  | "top" | "top-right" | "right" | "bottom-right"
  | "bottom" | "bottom-left" | "left" | "top-left";
/** Clockwise loop order — the UI cycle button steps through this. */
export const HANG_PLACES: HangPlace[] = [
  "top", "top-right", "right", "bottom-right",
  "bottom", "bottom-left", "left", "top-left",
];
/** Prose form for captions and the order email ("top-left" → "top left"). */
export const hangPlaceLabel = (h: HangPlace) => h.replace("-", " ");

const HANG_DIR: Record<HangPlace, { dx: number; dz: number }> = {
  top: { dx: 0, dz: 1 },
  "top-right": { dx: Math.SQRT1_2, dz: Math.SQRT1_2 },
  right: { dx: 1, dz: 0 },
  "bottom-right": { dx: Math.SQRT1_2, dz: -Math.SQRT1_2 },
  bottom: { dx: 0, dz: -1 },
  "bottom-left": { dx: -Math.SQRT1_2, dz: -Math.SQRT1_2 },
  left: { dx: -1, dz: 0 },
  "top-left": { dx: -Math.SQRT1_2, dz: Math.SQRT1_2 },
};

/**
 * Point on the plate outline where the pendant bail mounts, in the normalized
 * [-0.5, 0.5] plane the mesh builders use (+z = north = "top", -x = "left").
 * The bail hangs flat on the OUTER side face at this point, vertically
 * centered on the side. Rectangle: edge/corner of the square; heart/circle:
 * the outline point in that direction.
 */
export function hangAnchor(shape: Shape, place: HangPlace): { x: number; z: number } {
  const { dx, dz } = HANG_DIR[place];
  if (shape === "rectangle") {
    const t = 0.5 / Math.max(Math.abs(dx), Math.abs(dz));
    return { x: dx * t, z: dz * t };
  }
  const outline = shape === "heart" ? heartBoundary(256) : circleBoundary(256);
  const target = Math.atan2(dz, dx);
  let best = outline[0];
  let bestDiff = Infinity;
  for (const p of outline) {
    let d = Math.abs(Math.atan2(p.z, p.x) - target);
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (d < bestDiff) { bestDiff = d; best = p; }
  }
  return best;
}

export interface MetalSpec {
  label: string;
  color: number;
  roughness: number;
  priceFrom: number;
}

export const METALS: Record<Metal, MetalSpec> = {
  gold:     { label: "14k gold",        color: 0xcba063, roughness: 0.15, priceFrom: 1290 },
  silver:   { label: "sterling silver", color: 0xcbced2, roughness: 0.18, priceFrom: 680 },
  platinum: { label: "platinum",        color: 0xdadde2, roughness: 0.10, priceFrom: 2400 },
};

export interface DesignInput {
  width: number; // plaque side, in mm (real-world)
  relief: number; // max relief height in mm (real-world)
  thickness: number; // base thickness in mm
}

/** Map user-facing design inputs to concrete relief-plaque geometry parameters
    (mm). `res` sets the top-surface vertex density — the live viewer uses the
    GRID default; STL export may pass a denser value. */
export function toSlabParams({ width, relief, thickness }: DesignInput, res: number = GRID - 1): SlabParams {
  return {
    width, // mm: plate side is exactly the slider value
    depth: width,
    base: Math.max(0.5, thickness), // mm: user-set solid base thickness
    amp: relief, // mm: relief height above the base
    resX: res,
    resZ: res,
  };
}

/** Geometry parameters for the given shape from the user's design inputs. */
export function toShapeParams(_shape: Shape, input: DesignInput, res?: number): SlabParams {
  return toSlabParams(input, res);
}

/** Build the watertight mesh for the given shape. */
export function buildShapeMesh(
  shape: Shape,
  height: Float32Array,
  params: SlabParams,
): RingMeshData {
  switch (shape) {
    case "heart":
      return buildHeartMesh(height, params);
    case "circle":
      return buildCircleMesh(height, params);
    default:
      return buildSlabMesh(height, params);
  }
}

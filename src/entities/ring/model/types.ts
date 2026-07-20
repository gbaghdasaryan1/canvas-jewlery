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

export type JewelryType = "pendant" | "ring" | "bracelet";
export const JEWELRY_TYPES: JewelryType[] = ["pendant", "ring", "bracelet"];

/** Button/caption text per type. */
export const JEWELRY_LABELS: Record<JewelryType, string> = {
  pendant: "Pendant",
  ring: "Ring",
  bracelet: "Bracelet",
};

/** Ring: no bezel frame, no bail, a shank under the plate, and a
    plate-orientation control instead of a hanging point. */
export const isRing = (t: JewelryType): boolean => t === "ring";

/**
 * Where the bail/loop attaches, as an angle in degrees around the plate:
 * 0 = top, increasing clockwise (90 = right, 180 = bottom, 270 = left).
 * An angle rather than a fixed set of named sides lets the cycle button offer
 * any number of evenly-spaced positions.
 */
export type HangPlace = number;

/** How many evenly-spaced stops each type's cycle button steps through. */
export const PENDANT_HANG_STEPS = 8; // 45° apart, all the way round
export const BRACELET_HANG_STEPS = 4; // a parallel pair → 4 distinct axes, 45° apart

/** Compass names at 45° increments, for labelling angles that land on one. */
const HANG_NAMES = [
  "top", "top-right", "right", "bottom-right",
  "bottom", "bottom-left", "left", "top-left",
];

const norm360 = (deg: number) => ((deg % 360) + 360) % 360;

/** Prose form for captions and the order summary — a compass name when the
    angle sits on one (multiple of 45°), otherwise the rounded degrees. */
export const hangPlaceLabel = (deg: number): string => {
  const a = norm360(deg);
  return a % 45 === 0 ? HANG_NAMES[a / 45].replace("-", " ") : `${Math.round(a)}°`;
};

/** Both ends of a bracelet's parallel pair, e.g. "top & bottom". */
export const hangAxisLabel = (deg: number) =>
  `${hangPlaceLabel(deg)} & ${hangPlaceLabel(deg + 180)}`;

/**
 * Advance the hanging point one step for the cycle button. Pendants step
 * through PENDANT_HANG_STEPS evenly-spaced positions around the plate; a
 * bracelet's two bails are a parallel pair, so its stops only span half the
 * circle and wrap after BRACELET_HANG_STEPS distinct axes. The current angle
 * is snapped to the grid before advancing, so an off-grid value still lands
 * on a valid stop.
 */
export function nextHangPlace(deg: number, jewelryType: JewelryType): HangPlace {
  if (jewelryType === "bracelet") {
    const step = 180 / BRACELET_HANG_STEPS; // axes span only half the circle
    return norm360(Math.round(deg / step) * step + step) % 180;
  }
  const step = 360 / PENDANT_HANG_STEPS;
  return norm360(Math.round(deg / step) * step + step);
}

/**
 * Point on the plate outline where the pendant bail mounts, in the normalized
 * [-0.5, 0.5] plane the mesh builders use (+z = north = "top", -x = "left").
 * The bail hangs flat on the OUTER side face at this point, vertically
 * centered on the side. Rectangle: edge/corner of the square; heart/circle:
 * the outline point in that direction.
 */
export function hangAnchor(shape: Shape, deg: number): { x: number; z: number } {
  const r = (deg * Math.PI) / 180;
  const dx = Math.sin(r); // top = +z, clockwise
  const dz = Math.cos(r);
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

/**
 * Every bail anchor for a piece, in the normalized [-0.5, 0.5] plane. Pendants
 * hang from the single chosen `hangPlace`; a bracelet is a chain link, so it
 * gets two parallel bails on the left and right edges to connect into the band
 * on both sides. Rings have none. Drives the viewers and the exported mesh so
 * all three stay in sync.
 */
export function hangAnchors(
  shape: Shape,
  jewelryType: JewelryType,
  hangPlace: HangPlace,
): { x: number; z: number }[] {
  if (jewelryType === "pendant") return [hangAnchor(shape, hangPlace)];
  if (jewelryType === "bracelet")
    return [hangAnchor(shape, hangPlace), hangAnchor(shape, hangPlace + 180)];
  return [];
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
export function toSlabParams({ width, relief, thickness }: DesignInput, res: number = GRID - 1, frame = true): SlabParams {
  return {
    width, // mm: plate side is exactly the slider value
    depth: width,
    base: Math.max(0.5, thickness), // mm: user-set solid base thickness
    amp: relief, // mm: relief height above the base
    resX: res,
    resZ: res,
    frame, // rings pass false — the relief sits flush, no bezel wall
  };
}

/** Geometry parameters for the given shape from the user's design inputs.
    `frame` gates the raised bezel wall — pass false for rings. */
export function toShapeParams(_shape: Shape, input: DesignInput, res?: number, frame = true): SlabParams {
  return toSlabParams(input, res, frame);
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

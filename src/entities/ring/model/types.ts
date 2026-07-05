import { GRID } from "@/shared/config/presets";
import {
  buildCircleMesh,
  buildHeartMesh,
  buildSlabMesh,
  type RingMeshData,
  type SlabParams,
} from "@/shared/lib/ringGeometry";

export type Metal = "gold" | "silver" | "platinum";

/** The physical form the terrain is rendered into. */
export type Shape = "rectangle" | "heart" | "circle";

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

/** Map user-facing design inputs to concrete relief-plaque geometry parameters (mm). */
export function toSlabParams({ width, relief, thickness }: DesignInput): SlabParams {
  return {
    width, // mm: plate side is exactly the slider value
    depth: width,
    base: Math.max(0.5, thickness), // mm: user-set solid base thickness
    amp: relief, // mm: relief height above the base
    resX: GRID - 1,
    resZ: GRID - 1,
  };
}

/** Geometry parameters for the given shape from the user's design inputs. */
export function toShapeParams(_shape: Shape, input: DesignInput): SlabParams {
  return toSlabParams(input);
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

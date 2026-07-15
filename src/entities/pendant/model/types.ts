import type { Vec2 } from "@/shared/lib/geo2d";

/** Pendant silhouettes designed from an uploaded image (route: /pendant).
 *
 *  Two coordinate spaces:
 *  - silhouette space: pixels of the (downscaled) segmentation mask, y-down,
 *    origin top-left;
 *  - pendant space: millimetres, y-down, origin at the pendant centre
 *    (top edge of the pendant is at y = -height/2).
 */
export type PendantShape = "circle" | "rectangle" | "freeform";

export interface HoleConfig {
  /** Centre, mm from pendant centre. */
  x: number;
  y: number;
  diameter: number; // mm
}

export interface PendantConfig {
  shape: PendantShape;
  /** Circle: diameter. Rectangle: width. Freeform: target size of the object's
   *  longest side (the outline then follows the object). All mm. */
  width: number;
  height: number; // mm — rectangle only
  border: number; // mm of metal guaranteed around the object
  thickness: number; // mm — base plate thickness (extrusion depth in 3D)
  relief: number; // mm — how far the object silhouette is embossed on the face (0 = flat)
  hole: HoleConfig;
}

/** Placement of the silhouette inside the pendant. `scale` converts
 *  silhouette pixels to millimetres; x/y position the object's bounding-box
 *  centre relative to the pendant centre; rotation in degrees. */
export interface ObjectTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface PendantDesign {
  config: PendantConfig;
  object: ObjectTransform;
}

/** Output of the image-segmentation pipeline, consumed by the designer. */
export interface SilhouetteInfo {
  originalUrl: string; // uploaded image (data URL)
  cutoutUrl: string; // background removed, transparent PNG (data URL)
  silhouetteUrl: string; // black-on-white filled silhouette (data URL)
  maskWidth: number; // silhouette-space dimensions
  maskHeight: number;
  contours: Vec2[][]; // cleaned outer contours, silhouette px
  mainContour: Vec2[]; // largest contour = the detected main object
  svgPath: string; // vectorized silhouette path (silhouette px space)
}

export interface Measurements {
  width: number; // mm — pendant bounding width
  height: number; // mm
  border: number; // mm
  thickness: number; // mm
  holeDiameter: number; // mm
  area: number; // mm² — material face area (outline minus hole)
}

/** Minimum metal between the chain hole and the object. */
export const HOLE_CLEARANCE = 0.6;
/** Minimum metal between the chain hole and the pendant's outer edge. */
export const MIN_RIM = 0.8;

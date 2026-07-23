import type { Vec2 } from "@/shared/lib/geo2d";
import type { SilhouetteInfo } from "@/entities/pendant/model/types";

export type SegmentationStage =
  "loading-model" | "removing-background" | "detecting-object" | "vectorizing" | "done";

export interface SegmentationProgress {
  stage: SegmentationStage;
  /** 0..1 within the stage (best effort — some stages report no granularity). */
  progress: number;
  message: string;
}

export interface DetectedObject {
  maskWidth: number;
  maskHeight: number;
  contours: Vec2[][];
  mainContour: Vec2[];
}

/** Provider-agnostic image → silhouette pipeline. The UI depends only on this
 *  interface; swap the client-side implementation for a hosted API by
 *  returning a different implementation from `createSegmentationService`.
 *
 *  The step methods are stateful and must be called in order; `process` runs
 *  the whole pipeline. */
export interface ImageSegmentationService {
  /** AI background removal. Returns a transparent-PNG data URL. */
  removeBackground(file: Blob, onProgress?: (p: SegmentationProgress) => void): Promise<string>;
  /** Contour detection on the cutout: main object, noise filtered, smoothed. */
  detectMainObject(): Promise<DetectedObject>;
  /** Filled black-on-white silhouette of the detected contours (data URL). */
  generateSilhouette(): Promise<string>;
  /** Vectorize the silhouette; returns an SVG path `d` in mask-pixel space. */
  generateSVG(): Promise<string>;
  /** Full pipeline: upload → cutout → contours → silhouette → SVG. */
  process(file: File, onProgress?: (p: SegmentationProgress) => void): Promise<SilhouetteInfo>;
}

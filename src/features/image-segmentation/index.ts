import { ClientSegmentationService } from "./lib/clientService";
import type { ImageSegmentationService } from "./model/types";

export type {
  DetectedObject,
  ImageSegmentationService,
  SegmentationProgress,
  SegmentationStage,
} from "./model/types";

/** Factory the UI consumes — swap the implementation here (e.g. for a hosted
 *  segmentation API) without touching any component. */
export function createSegmentationService(): ImageSegmentationService {
  return new ClientSegmentationService();
}

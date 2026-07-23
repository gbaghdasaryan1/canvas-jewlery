import { chaikinSmooth, polysToPath, type Vec2 } from "@/shared/lib/geo2d";
import type { SilhouetteInfo } from "@/entities/pendant/model/types";
import type {
  DetectedObject,
  ImageSegmentationService,
  SegmentationProgress,
} from "../model/types";
import { blobToDataURL, chromaKeyFallback, drawToCanvas, loadImage } from "./imageUtils";
import { loadOpenCV } from "./opencvLoader";

/** Longest side of the working mask — contours and the exported SVG path live
 *  in this pixel space. */
const MASK_MAX_SIDE = 640;
const ALPHA_THRESHOLD = 96;

interface CutoutState {
  url: string;
  imageData: ImageData; // downscaled to MASK_MAX_SIDE
  width: number;
  height: number;
}

/** Fully client-side implementation: @imgly/background-removal (ONNX in the
 *  browser, no API key) → OpenCV.js contour detection → Potrace (wasm)
 *  vectorization. Every stage has a graceful fallback so the designer keeps
 *  working offline, just with cruder silhouettes. */
export class ClientSegmentationService implements ImageSegmentationService {
  private cutout: CutoutState | null = null;
  private detected: DetectedObject | null = null;
  private silhouetteCanvas: HTMLCanvasElement | null = null;

  async removeBackground(
    file: Blob,
    onProgress?: (p: SegmentationProgress) => void,
  ): Promise<string> {
    let url: string;
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(file, {
        progress: (key, current, total) => {
          const isFetch = key.startsWith("fetch");
          onProgress?.({
            stage: isFetch ? "loading-model" : "removing-background",
            progress: total > 0 ? current / total : 0,
            message: isFetch ? "Downloading AI model…" : "Removing background…",
          });
        },
      });
      url = await blobToDataURL(blob);
    } catch (err) {
      console.warn("AI background removal unavailable, using chroma-key fallback", err);
      onProgress?.({
        stage: "removing-background",
        progress: 0.5,
        message: "AI unavailable — using color-key fallback…",
      });
      const img = await loadImage(await blobToDataURL(file));
      const { canvas, ctx, imageData } = drawToCanvas(img, 1600);
      ctx.putImageData(chromaKeyFallback(imageData), 0, 0);
      url = canvas.toDataURL("image/png");
    }

    const img = await loadImage(url);
    const { imageData } = drawToCanvas(img, MASK_MAX_SIDE);
    this.cutout = { url, imageData, width: imageData.width, height: imageData.height };
    this.detected = null;
    this.silhouetteCanvas = null;
    return url;
  }

  async detectMainObject(): Promise<DetectedObject> {
    const cutout = this.cutout;
    if (!cutout) throw new Error("removeBackground must run before detectMainObject");
    const { width, height, imageData } = cutout;

    const mask = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      mask[i] = imageData.data[i * 4 + 3] > ALPHA_THRESHOLD ? 255 : 0;
    }

    let contours: Vec2[][];
    try {
      contours = await detectContoursCv(mask, width, height);
    } catch (err) {
      console.warn("OpenCV contour detection failed, using bounds fallback", err);
      contours = [maskBoundsContour(mask, width, height)];
    }
    if (contours.length === 0) throw new Error("No object detected in the image");

    const mainContour = contours.reduce((best, c) =>
      Math.abs(ringArea(c)) > Math.abs(ringArea(best)) ? c : best,
    );
    this.detected = { maskWidth: width, maskHeight: height, contours, mainContour };
    return this.detected;
  }

  async generateSilhouette(): Promise<string> {
    const det = this.detected;
    if (!det) throw new Error("detectMainObject must run before generateSilhouette");
    const canvas = document.createElement("canvas");
    canvas.width = det.maskWidth;
    canvas.height = det.maskHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    for (const contour of det.contours) {
      ctx.beginPath();
      contour.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
    }
    this.silhouetteCanvas = canvas;
    return canvas.toDataURL("image/png");
  }

  async generateSVG(): Promise<string> {
    const det = this.detected;
    if (!det) throw new Error("detectMainObject must run before generateSVG");
    if (!this.silhouetteCanvas) await this.generateSilhouette();
    try {
      const { init, potrace } = await import("esm-potrace-wasm");
      await init();
      const result = await potrace(this.silhouetteCanvas!, {
        turdsize: 8,
        alphamax: 1,
        opticurve: 1,
        extractcolors: false,
      });
      const svg = Array.isArray(result) ? result.join(" ") : result;
      const d = [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]).join(" ");
      if (d) return d;
      throw new Error("Potrace returned no path");
    } catch (err) {
      console.warn("Potrace vectorization failed, using polygon path fallback", err);
      return polysToPath(det.contours);
    }
  }

  async process(
    file: File,
    onProgress?: (p: SegmentationProgress) => void,
  ): Promise<SilhouetteInfo> {
    const originalUrl = await blobToDataURL(file);
    const cutoutUrl = await this.removeBackground(file, onProgress);

    onProgress?.({ stage: "detecting-object", progress: 0, message: "Detecting object…" });
    const detected = await this.detectMainObject();
    const silhouetteUrl = await this.generateSilhouette();

    onProgress?.({ stage: "vectorizing", progress: 0, message: "Vectorizing silhouette…" });
    const svgPath = await this.generateSVG();

    onProgress?.({ stage: "done", progress: 1, message: "Done" });
    return {
      originalUrl,
      cutoutUrl,
      silhouetteUrl,
      maskWidth: detected.maskWidth,
      maskHeight: detected.maskHeight,
      contours: detected.contours,
      mainContour: detected.mainContour,
      svgPath,
    };
  }
}

/** OpenCV pipeline: open/close to drop speckles, blur+threshold to smooth the
 *  edge, external contours only, tiny regions discarded, gentle poly approx,
 *  then one Chaikin pass for a clean rounded outline. */
async function detectContoursCv(
  mask: Uint8Array,
  width: number,
  height: number,
): Promise<Vec2[][]> {
  const cv = await loadOpenCV();
  const src = cv.matFromArray(height, width, cv.CV_8UC1, mask);
  const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
  const contoursVec = new cv.MatVector();
  const hierarchy = new cv.Mat();
  try {
    cv.morphologyEx(src, src, cv.MORPH_OPEN, kernel);
    cv.morphologyEx(src, src, cv.MORPH_CLOSE, kernel);
    cv.GaussianBlur(src, src, new cv.Size(7, 7), 0);
    cv.threshold(src, src, 127, 255, cv.THRESH_BINARY);
    cv.findContours(src, contoursVec, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_TC89_L1);

    const raw: { area: number; poly: Vec2[] }[] = [];
    for (let i = 0; i < contoursVec.size(); i++) {
      const cnt = contoursVec.get(i);
      const area = cv.contourArea(cnt);
      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.0035 * cv.arcLength(cnt, true), true);
      const poly: Vec2[] = [];
      for (let j = 0; j < approx.rows; j++) {
        poly.push({ x: approx.data32S[j * 2], y: approx.data32S[j * 2 + 1] });
      }
      approx.delete();
      cnt.delete();
      if (poly.length >= 3) raw.push({ area, poly });
    }

    const maxArea = raw.reduce((m, c) => Math.max(m, c.area), 0);
    const minArea = Math.max(100, maxArea * 0.02);
    return raw.filter((c) => c.area >= minArea).map((c) => chaikinSmooth(c.poly, 1));
  } finally {
    src.delete();
    kernel.delete();
    contoursVec.delete();
    hierarchy.delete();
  }
}

/** Last-resort contour: the bounding box of all opaque pixels. */
function maskBoundsContour(mask: Uint8Array, width: number, height: number): Vec2[] {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX > maxX) throw new Error("No object detected in the image");
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

function ringArea(ring: Vec2[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

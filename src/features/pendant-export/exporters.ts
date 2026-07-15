import { polygonBounds, polysToPath, type Vec2 } from "@/shared/lib/geo2d";
import type { PendantDesign, SilhouetteInfo } from "@/entities/pendant/model/types";
import {
  contoursMm,
  computeMeasurements,
  outlinePathMm,
  pendantOutline,
} from "@/entities/pendant/lib/geometry";

/** Production SVG in real millimetres: pendant face (hole punched via
 *  evenodd) plus the engraved object contours. */
export function buildSVG(design: PendantDesign, sil: SilhouetteInfo | null): string {
  const outline = pendantOutline(design, sil);
  const { config } = design;
  const b = polygonBounds(outline);
  const m = 2; // mm margin
  const w = (b.width + m * 2).toFixed(2);
  const h = (b.height + m * 2).toFixed(2);
  const viewBox = `${(b.minX - m).toFixed(2)} ${(b.minY - m).toFixed(2)} ${w} ${h}`;
  const objectPath = sil ? polysToPath(contoursMm(sil, design.object)) : "";
  const meta = computeMeasurements(design, outline);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="${viewBox}">`,
    `  <!-- pendant: ${config.shape}; thickness ${config.thickness}mm; face area ${meta.area.toFixed(1)}mm² -->`,
    `  <path d="${outlinePathMm(outline, config.hole)}" fill="#c8ccd4" stroke="#5a6069" stroke-width="0.15" fill-rule="evenodd"/>`,
    objectPath
      ? `  <path d="${objectPath}" fill="#3a3f46" stroke="none" fill-rule="evenodd"/>`
      : "",
    `</svg>`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Placeholder DXF (R12-style): outline polylines + hole circle. Enough for a
 *  CAD sanity check, not yet a validated manufacturing file. Y is flipped to
 *  DXF's y-up convention. */
export function buildDXF(design: PendantDesign, sil: SilhouetteInfo | null): string {
  const outline = pendantOutline(design, sil);
  const { hole } = design.config;
  const lines: string[] = ["999", "CAIRN pendant export — DXF placeholder", "0", "SECTION", "2", "ENTITIES"];
  const polyline = (ring: Vec2[]) => {
    lines.push("0", "POLYLINE", "8", "PENDANT", "66", "1", "70", "1");
    for (const p of ring) {
      lines.push("0", "VERTEX", "8", "PENDANT", "10", p.x.toFixed(3), "20", (-p.y).toFixed(3));
    }
    lines.push("0", "SEQEND");
  };
  outline.forEach(polyline);
  lines.push(
    "0", "CIRCLE", "8", "HOLE",
    "10", hole.x.toFixed(3),
    "20", (-hole.y).toFixed(3),
    "40", (hole.diameter / 2).toFixed(3),
  );
  lines.push("0", "ENDSEC", "0", "EOF");
  return lines.join("\n");
}

/** Self-describing project file — everything needed to restore the design
 *  (the original upload is omitted to keep the file small). */
export function buildProjectJSON(
  design: PendantDesign,
  sil: SilhouetteInfo | null,
  fileName: string | null,
): string {
  return JSON.stringify(
    {
      app: "cairn-pendant",
      version: 1,
      createdAt: new Date().toISOString(),
      sourceFileName: fileName,
      design,
      silhouette: sil
        ? {
            maskWidth: sil.maskWidth,
            maskHeight: sil.maskHeight,
            contours: sil.contours,
            mainContour: sil.mainContour,
            svgPath: sil.svgPath,
            cutoutUrl: sil.cutoutUrl,
            silhouetteUrl: sil.silhouetteUrl,
          }
        : null,
    },
    null,
    2,
  );
}

/** Rasterize a canvas element to a PNG download (blob URL — data URLs of
 *  this size are blocked by Chromium's anchor-download limit). */
export function downloadCanvasPNG(canvas: HTMLCanvasElement, fileName: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    downloadUrl(fileName, url);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, "image/png");
}

export function downloadText(fileName: string, mime: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  downloadUrl(fileName, url);
  // revoke after the download has had a chance to start
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function downloadUrl(fileName: string, url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
}

import {
  circlePath,
  circlePolygon,
  distToPolygonEdge,
  offsetPolygon,
  pointInPolygon,
  polygonArea,
  polygonBounds,
  polysToPath,
  roundedRectPolygon,
  transformPoints,
  unionPolygons,
  type Vec2,
} from "@/shared/lib/geo2d";
import {
  HOLE_CLEARANCE,
  MIN_RIM,
  type HoleConfig,
  type ObjectTransform,
  type PendantConfig,
  type PendantDesign,
  type Measurements,
  type SilhouetteInfo,
} from "../model/types";

/** Pendant height in mm for the current shape (circle has no height knob). */
export function pendantHeight(config: PendantConfig): number {
  return config.shape === "circle" ? config.width : config.height;
}

/** The transform origin: centre of the main contour's bounding box (px). */
export function objectOriginPx(sil: SilhouetteInfo): Vec2 {
  const b = polygonBounds(sil.mainContour);
  return { x: b.cx, y: b.cy };
}

/** Main contour mapped into pendant space (mm). */
export function mainContourMm(sil: SilhouetteInfo, t: ObjectTransform): Vec2[] {
  return transformPoints(sil.mainContour, objectOriginPx(sil), t.scale, t.rotation, {
    x: t.x,
    y: t.y,
  });
}

/** All contours mapped into pendant space (mm). */
export function contoursMm(sil: SilhouetteInfo, t: ObjectTransform): Vec2[][] {
  const origin = objectOriginPx(sil);
  return sil.contours.map((c) =>
    transformPoints(c, origin, t.scale, t.rotation, { x: t.x, y: t.y }),
  );
}

/** Default hole position for a shape: top centre, just inside the rim.
 *  For freeform the hole lives in a tab above the object's top edge. */
export function defaultHole(
  config: PendantConfig,
  objectMm: Vec2[] | null,
): Pick<HoleConfig, "x" | "y"> {
  const r = config.hole.diameter / 2;
  if (config.shape === "freeform") {
    if (objectMm && objectMm.length) {
      const b = polygonBounds(objectMm);
      return { x: b.cx, y: b.minY - HOLE_CLEARANCE - r };
    }
    return { x: 0, y: -(config.width / 2) };
  }
  return { x: 0, y: -(pendantHeight(config) / 2) + MIN_RIM + r };
}

/** Clamp the hole inside the pendant and push it away from the object so the
 *  two can never overlap. Object avoidance wins over rim distance. */
export function resolveHole(design: PendantDesign, sil: SilhouetteInfo | null): HoleConfig {
  const { config, object } = design;
  const r = config.hole.diameter / 2;
  let { x, y } = config.hole;

  const H = pendantHeight(config);
  const W = config.width;

  if (config.shape === "rectangle") {
    x = Math.max(-(W / 2) + r + MIN_RIM, Math.min(W / 2 - r - MIN_RIM, x));
    y = Math.max(-(H / 2) + r + MIN_RIM, Math.min(H / 2 - r - MIN_RIM, y));
  } else if (config.shape === "circle") {
    const maxDist = Math.max(0, W / 2 - r - MIN_RIM);
    const d = Math.hypot(x, y);
    if (d > maxDist) {
      const k = d === 0 ? 0 : maxDist / d;
      x *= k;
      y *= k;
    }
  }

  if (sil) {
    const contour = mainContourMm(sil, object);
    if (contour.length >= 3) {
      const overlaps = (px: number, py: number) => {
        const p = { x: px, y: py };
        return pointInPolygon(p, contour) || distToPolygonEdge(p, contour) < r + HOLE_CLEARANCE;
      };
      if (config.shape === "freeform") {
        const b = polygonBounds(contour);
        x = Math.max(b.minX - r, Math.min(b.maxX + r, x));
        if (y > b.minY - r - HOLE_CLEARANCE) y = b.minY - r - HOLE_CLEARANCE;
      }
      // walk the hole upward until it clears the object
      let guard = 0;
      while (overlaps(x, y) && guard++ < 400) y -= 0.25;
    }
  }

  return { x, y, diameter: config.hole.diameter };
}

/** Fit the detected object inside the pendant: centred, aspect preserved,
 *  border respected, and the hole zone at the top left free. */
export function autoFit(config: PendantConfig, sil: SilhouetteInfo): ObjectTransform {
  const b = polygonBounds(sil.mainContour);
  if (b.width === 0 || b.height === 0) return { x: 0, y: 0, scale: 1, rotation: 0 };

  if (config.shape === "freeform") {
    const scale = config.width / Math.max(b.width, b.height);
    return { x: 0, y: 0, scale, rotation: 0 };
  }

  const W = config.width;
  const H = pendantHeight(config);
  const r = config.hole.diameter / 2;
  const holeY = -(H / 2) + MIN_RIM + r;
  const top = holeY + r + HOLE_CLEARANCE + 0.3;
  const bottom = H / 2 - config.border;
  const left = -(W / 2) + config.border;
  const right = W / 2 - config.border;
  const availW = Math.max(1, right - left);
  const availH = Math.max(1, bottom - top);

  let scale = Math.min(availW / b.width, availH / b.height) * 0.98;
  const cy = (top + bottom) / 2;

  if (config.shape === "circle") {
    // shrink until the scaled bounding box fits inside the inner circle too
    const R = W / 2 - config.border;
    for (let i = 0; i < 80; i++) {
      const hw = (b.width * scale) / 2;
      const hh = (b.height * scale) / 2;
      const worst = Math.max(Math.hypot(hw, cy - hh), Math.hypot(hw, cy + hh));
      if (worst <= R) break;
      scale *= 0.97;
    }
  }

  return { x: 0, y: cy, scale, rotation: 0 };
}

/** Outer ring(s) of the pendant body, mm. Freeform = object contour offset by
 *  the border, unioned with a tab around the chain hole. */
export function pendantOutline(design: PendantDesign, sil: SilhouetteInfo | null): Vec2[][] {
  const { config } = design;
  switch (config.shape) {
    case "circle":
      return [circlePolygon(0, 0, config.width / 2)];
    case "rectangle":
      return [
        roundedRectPolygon(0, 0, config.width, config.height, Math.min(2, config.border + 1)),
      ];
    case "freeform": {
      if (!sil || sil.mainContour.length < 3) return [circlePolygon(0, 0, config.width / 2)];
      const contour = mainContourMm(sil, design.object);
      const body = offsetPolygon(contour, Math.max(0.2, config.border));
      const r = config.hole.diameter / 2;
      const tab = circlePolygon(config.hole.x, config.hole.y, r + Math.max(1, config.border), 48);
      const merged = unionPolygons([...body, tab]);
      return merged.sort((a, b) => polygonArea(b) - polygonArea(a));
    }
  }
}

/** SVG path of the pendant face: outline ring(s) plus the hole as an inner
 *  ring — render with fill-rule="evenodd" to punch the hole. */
export function outlinePathMm(outline: Vec2[][], hole: HoleConfig): string {
  return `${polysToPath(outline)} ${circlePath(hole.x, hole.y, hole.diameter / 2)}`;
}

export function computeMeasurements(design: PendantDesign, outline: Vec2[][]): Measurements {
  const { config } = design;
  const b = polygonBounds(outline);
  const holeR = config.hole.diameter / 2;
  const faceArea = outline.reduce((sum, ring) => sum + polygonArea(ring), 0);
  return {
    width: b.width,
    height: b.height,
    border: config.border,
    thickness: config.thickness,
    holeDiameter: config.hole.diameter,
    area: Math.max(0, faceArea - Math.PI * holeR * holeR),
  };
}

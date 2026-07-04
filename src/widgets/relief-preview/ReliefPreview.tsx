import { useEffect, useRef } from "react";
import { GRID } from "@/shared/config/presets";
import { smoothGrid } from "@/shared/lib/smooth";
import type { TerrainGrid } from "@/entities/terrain/model/types";
import type { StreetLine } from "@/entities/streets/api/fetchStreets";
import type { BuildingPolygon } from "@/entities/buildings/api/fetchBuildings";

interface ReliefPreviewProps {
  terrain: TerrainGrid | null;
  smooth: number;
  /** Patch centre + size, needed to project map features onto the canvas. */
  lat: number;
  lng: number;
  areaKm: number;
  /** OSM street network to overlay (already fetched), or null to hide. */
  streets?: StreetLine[] | null;
  /** OSM building footprints to overlay, or null to hide. */
  buildings?: BuildingPolygon[] | null;
}

/** Road casing/fill width in px (at 264px canvas) by OSM highway class. */
function roadWidth(cls: string): number {
  switch (cls) {
    case "motorway":
    case "trunk": return 3.0;
    case "primary": return 2.5;
    case "secondary": return 2.0;
    case "tertiary": return 1.7;
    case "residential":
    case "unclassified":
    case "living_street": return 1.2;
    default: return 1.0;
  }
}

/** Shaded-relief + contour rendering of the sampled patch (map -> terrain). */
export function ReliefPreview({
  terrain,
  smooth,
  lat,
  lng,
  areaKm,
  streets,
  buildings,
}: ReliefPreviewProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const S = cv.width;
    if (!terrain) {
      ctx.clearRect(0, 0, S, S);
      return;
    }
    const H = smoothGrid(terrain.data, smooth); // round off sharp ridges
    const N = GRID;
    const span = terrain.max - terrain.min || 1;
    const img = ctx.createImageData(S, S);
    const lx = -0.6, ly = -0.7, lz = 0.8;

    for (let py = 0; py < S; py++)
      for (let px = 0; px < S; px++) {
        const gx = (px / S) * (N - 1), gy = (py / S) * (N - 1);
        const x0 = Math.floor(gx), y0 = Math.floor(gy);
        const x1 = Math.min(x0 + 1, N - 1), y1 = Math.min(y0 + 1, N - 1);
        const tx = gx - x0, ty = gy - y0;
        const e =
          (H[y0 * N + x0] + (H[y0 * N + x1] - H[y0 * N + x0]) * tx) * (1 - ty) +
          (H[y1 * N + x0] + (H[y1 * N + x1] - H[y1 * N + x0]) * tx) * ty;
        const ex = H[y0 * N + x1] - H[y0 * N + x0];
        const ey = H[y1 * N + x0] - H[y0 * N + x0];
        let nx = (-ex / span) * 6, ny = (-ey / span) * 6;
        const il = Math.hypot(nx, ny, 1);
        const sh = Math.max(0, (nx * lx + ny * ly + 1 * lz) / il);
        const t = (e - terrain.min) / span;
        const o = (py * S + px) * 4;
        img.data[o] = 30 + t * 150 + sh * 70;
        img.data[o + 1] = 26 + t * 120 + sh * 60;
        img.data[o + 2] = 18 + t * 60 + sh * 40;
        img.data[o + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);

    // contour ticks
    ctx.save();
    ctx.fillStyle = "#e7ce97";
    ctx.globalAlpha = 0.4;
    const levels = 7;
    for (let L = 1; L < levels; L++) {
      const lev = terrain.min + (span * L) / levels;
      for (let py = 0; py < S - 2; py += 2)
        for (let px = 0; px < S - 2; px += 2) {
          const gx = (px / S) * (N - 1), gy = (py / S) * (N - 1);
          const xi = Math.min(Math.floor(gx), N - 2), yi = Math.min(Math.floor(gy), N - 2);
          const a = H[yi * N + xi], b = H[yi * N + xi + 1];
          if ((a - lev) * (b - lev) < 0) ctx.fillRect(px, py, 1.2, 1.2);
        }
    }
    ctx.restore();

    // Map overlays (buildings then streets) — projected to match the relief
    // (top = south, exactly as the terrain grid is sampled).
    if ((streets && streets.length) || (buildings && buildings.length)) {
      const dLat = areaKm / 111;
      const dLng = areaKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
      const southLat = lat - dLat / 2;
      const westLng = lng - dLng / 2;
      const sx = (lo: number) => ((lo - westLng) / dLng) * S;
      const sy = (la: number) => ((la - southLat) / dLat) * S;
      const scale = S / 264;

      // Buildings: filled footprints, lightly shaded by height.
      if (buildings && buildings.length) {
        ctx.save();
        ctx.strokeStyle = "rgba(60,48,30,0.5)";
        ctx.lineWidth = 0.6 * scale;
        for (const b of buildings) {
          ctx.beginPath();
          for (let i = 0; i < b.ring.length; i++) {
            const X = sx(b.ring[i][1]), Y = sy(b.ring[i][0]);
            if (i === 0) ctx.moveTo(X, Y);
            else ctx.lineTo(X, Y);
          }
          ctx.closePath();
          const tone = Math.min(1, b.height / 80); // taller -> a touch lighter
          ctx.fillStyle = `rgba(${198 + tone * 40},${178 + tone * 36},${150 + tone * 30},0.82)`;
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }

      // Streets: dark casing, then a light road fill — the classic map look.
      if (streets && streets.length) {
        const trace = (st: StreetLine) => {
          ctx.beginPath();
          for (let i = 0; i < st.pts.length; i++) {
            const X = sx(st.pts[i][1]), Y = sy(st.pts[i][0]);
            if (i === 0) ctx.moveTo(X, Y);
            else ctx.lineTo(X, Y);
          }
        };
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(16,12,7,0.6)";
        for (const st of streets) { trace(st); ctx.lineWidth = (roadWidth(st.cls) + 1.3) * scale; ctx.stroke(); }
        ctx.strokeStyle = "rgba(243,237,222,0.92)";
        for (const st of streets) { trace(st); ctx.lineWidth = roadWidth(st.cls) * scale; ctx.stroke(); }
        ctx.restore();
      }
    }
  }, [terrain, smooth, lat, lng, areaKm, streets, buildings]);

  return <canvas ref={ref} className="relief" width={264} height={264} />;
}

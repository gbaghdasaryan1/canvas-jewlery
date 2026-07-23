import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { RingMeshData } from "@/shared/lib/ringGeometry";
import type { BuildingPolygon } from "@/entities/buildings/api/fetchBuildings";
import type { StreetLine } from "@/entities/streets/api/fetchStreets";
import type { Shape } from "@/entities/ring/model/types";
import {
  FRAME_MM,
  ROAD_DEFAULT,
  ROAD_STYLES,
  TOWER_PROFILE,
  clipRingToOutline,
  insetOutline,
  makeClipToBoundary,
  makeHeightScale,
  makeInside,
  shapeOutline,
  type Pt,
} from "./cityShared";

export interface CityMeshInput {
  buildings: BuildingPolygon[] | null;
  streets: StreetLine[] | null;
  shape: Shape;
  lat: number;
  lng: number;
  areaKm: number;
  /** plate side, mm */
  widthMm: number;
  /** plate base thickness, mm */
  baseMm: number;
  /** max relief height, mm — tallest building reaches this (matches canvas) */
  reliefMm: number;
  /** When false, the solid base plate is omitted — only the frame and the
      streets/buildings remain (matches the canvas's hollow-floor mode). */
  solidFloor?: boolean;
  /** Orientation (degrees): rotate the inner content (buildings + streets)
      about the plate centre while the base + frame stay fixed. 0 = none. */
  contentYawDeg?: number;
}

const MIN_BUILDING_MM = 0.25; // castability floor for tiny buildings

/**
 * Build the downloadable city mesh from the SAME vector data and clipping
 * rules the on-screen CityViewer renders — shaped base plate, extruded
 * building footprints at true scale, street ribbons — so the STL matches the
 * canvas exactly. Output is a set of closed solids that overlap into the
 * plate (standard multi-shell STL; slicers and casting prep union them).
 */
export function buildCityMesh(input: CityMeshInput): RingMeshData | null {
  const {
    buildings,
    streets,
    shape,
    lat,
    lng,
    areaKm,
    widthMm,
    baseMm,
    reliefMm,
    solidFloor = true,
    contentYawDeg = 0,
  } = input;
  if (!buildings?.length && !streets?.length) return null;
  // Same soft-knee vertical scale as the canvas (see makeHeightScale).
  const heightScale = makeHeightScale(buildings?.map((b) => b.height) ?? []);
  // Street ridges scale with relief but are hard-capped at 0.5 mm so deep
  // reliefs don't produce oversized road bumps in the exported file.
  const streetRidgeMm = Math.min(Math.max(0.1 * reliefMm, 0.25), 0.5);

  const outline = shapeOutline(shape);
  // City content stops at the inner edge of the raised frame band (same
  // clipping the canvas uses).
  const innerOutline = insetOutline(outline, FRAME_MM / widthMm);
  const inside = makeInside(shape, innerOutline);
  const clipToBoundary = makeClipToBoundary(inside);
  // With no base plate (hollow streets), the streets must reach into the frame
  // so they fuse with it into one printable solid — clip them to the MIDDLE of
  // the frame band (half the frame width in) rather than the inner edge. That
  // overlaps the frame wall enough to connect, but stops short of the outer
  // edge so streets never poke past the frame. With a solid plate the base
  // already ties everything together, so streets stay off the frame there.
  const streetOutline = insetOutline(outline, (FRAME_MM * 0.5) / widthMm);
  const streetInside = solidFloor ? inside : makeInside(shape, streetOutline);
  const streetClip = solidFloor ? clipToBoundary : makeClipToBoundary(streetInside);

  const dLat = areaKm / 111;
  const dLng = areaKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  const south = lat - dLat / 2;
  const west = lng - dLng / 2;
  const nx = (lo: number) => (lo - west) / dLng - 0.5;
  const nz = (la: number) => (la - south) / dLat - 0.5;
  const mmPerM = widthMm / (areaKm * 1000); // true physical scale

  // Orientation: rotate a normalized (x, z) point about the plate centre.
  // Applied to building/street coords only, so the base + frame stay put and
  // the rotated content is clipped by the fixed outline.
  const yaw = (contentYawDeg * Math.PI) / 180;
  const yc = Math.cos(yaw),
    ys = Math.sin(yaw);
  const rot = (x: number, z: number): Pt =>
    yaw ? { x: x * yc - z * ys, z: x * ys + z * yc } : { x, z };

  const geoms: THREE.BufferGeometry[] = [];

  // Closed vertical prism over a normalized-plane polygon, y0..y1 in mm.
  // Same mapping as CityViewer: shape.y = -z so rotateX(-π/2) restores +z.
  const prism = (pts: Pt[], y0: number, y1: number, holes?: Pt[][]) => {
    const toV2 = (p: Pt) => new THREE.Vector2(p.x * widthMm, -p.z * widthMm);
    const s = new THREE.Shape(pts.map(toV2));
    for (const h of holes ?? []) s.holes.push(new THREE.Path(h.map(toV2)));
    const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    g.translate(0, y0, 0);
    geoms.push(g);
  };

  // Base plate (rectangle / heart / disc). Omitted in hollow-floor mode, where
  // only the frame + streets/buildings remain and the floor reads as empty.
  const base = Math.max(baseMm, 0.5);
  if (solidFloor) prism(outline, 0, base);
  // Solids above sink half-way into the plate so the shells always overlap
  // (no coplanar faces, robust boolean union downstream). With no plate they
  // stand on the ground plane (y = 0) instead.
  const sunk = solidFloor ? base * 0.5 : 0;
  // Raised frame wall along the whole outline: FRAME_MM thick, rising to the
  // full relief depth so it sits level with the tallest content.
  prism(outline, sunk, base + reliefMm, [innerOutline]);

  if (buildings?.length) {
    for (const b of buildings) {
      const pts: Pt[] = b.ring.map(([la, lo]) => rot(nx(lo), nz(la)));
      if (pts.length < 3) continue;
      const allIn = pts.every((p) => inside(p.x, p.z));
      const h = Math.max(heightScale(b.height) * reliefMm, MIN_BUILDING_MM);
      if (b.tower) {
        // Landmark tower: stacked tapered slices (see TOWER_PROFILE).
        // Spires stay strict (no half-spires at the plate edge).
        if (!allIn) continue;
        let cx = 0,
          cz = 0;
        for (const p of pts) {
          cx += p.x;
          cz += p.z;
        }
        cx /= pts.length;
        cz /= pts.length;
        for (let i = 0; i < TOWER_PROFILE.length; i++) {
          const { t0, t1, s } = TOWER_PROFILE[i];
          const sliced = pts.map((p) => ({ x: cx + (p.x - cx) * s, z: cz + (p.z - cz) * s }));
          // Slices overlap slightly so the shells union cleanly.
          prism(sliced, i === 0 ? sunk : base + t0 * h - 0.05, base + t1 * h);
        }
        continue;
      }
      // Buildings straddling the plate edge are sliced at the outline (same
      // as the canvas) — full height, cut footprint — instead of dropped.
      const rings = allIn ? [pts] : clipRingToOutline(pts, innerOutline);
      // building:part volumes start at min_height; overlap 0.05 mm into the
      // volume below so the shells union cleanly.
      const y0 = b.minHeight ? heightScale(b.minHeight) * reliefMm : 0;
      for (const ring of rings) {
        prism(ring, y0 > 0 ? base + y0 - 0.05 : sunk, base + Math.max(h, y0 + 0.1));
      }
    }
  }

  if (streets?.length) {
    for (const st of streets) {
      const style = ROAD_STYLES[st.cls] ?? ROAD_DEFAULT;
      const half = Math.max((style.widthM * mmPerM) / widthMm, 0.0012) / 2; // normalized units
      for (let i = 1; i < st.pts.length; i++) {
        const aPt = rot(nx(st.pts[i - 1][1]), nz(st.pts[i - 1][0]));
        const bPt = rot(nx(st.pts[i][1]), nz(st.pts[i][0]));
        let ax = aPt.x,
          az = aPt.z;
        let bx = bPt.x,
          bz = bPt.z;
        const aIn = streetInside(ax, az),
          bIn = streetInside(bx, bz);
        if (!aIn && !bIn) continue;
        if (!bIn) {
          const p = streetClip(ax, az, bx, bz);
          bx = p.x;
          bz = p.z;
        } else if (!aIn) {
          const p = streetClip(bx, bz, ax, az);
          ax = p.x;
          az = p.z;
        }
        const dx = bx - ax,
          dz = bz - az;
        const len = Math.hypot(dx, dz);
        if (len === 0) continue;
        const ox = (-dz / len) * half,
          oz = (dx / len) * half;
        prism(
          [
            { x: ax + ox, z: az + oz },
            { x: bx + ox, z: bz + oz },
            { x: bx - ox, z: bz - oz },
            { x: ax - ox, z: az - oz },
          ],
          sunk,
          base + streetRidgeMm,
        );
      }
    }
  }

  const merged = mergeGeometries(geoms, false);
  geoms.forEach((g) => g.dispose());
  if (!merged) return null;

  // ExtrudeGeometry output is non-indexed CCW triangles — exactly what the
  // binary STL writer needs; index them sequentially.
  const positions = Float32Array.from(merged.getAttribute("position").array as Float32Array);
  merged.dispose();
  const indices = new Uint32Array(positions.length / 3);
  for (let i = 0; i < indices.length; i++) indices[i] = i;
  return { positions, indices };
}

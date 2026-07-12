import { useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { BuildingPolygon } from "@/entities/buildings/api/fetchBuildings";
import type { StreetLine } from "@/entities/streets/api/fetchStreets";
import type { Shape } from "@/entities/ring/model/types";
import { DropBailCurve } from "@/shared/lib/bailCurve";
import {
  ROAD_DEFAULT,
  ROAD_STYLES,
  TOWER_PROFILE,
  makeClipToBoundary,
  makeHeightScale,
  makeInside,
  shapeOutline,
  type Pt,
} from "./cityShared";

/**
 * Three.js rendering of the fetched city block, styled to match the Mapbox
 * map (cityMapStyle.ts) — same ground color, the same height-graded silver
 * building extrusions, the same per-class road colors. The city is clipped to
 * the SAME shape outline the cast piece uses (heartBoundary / circleBoundary
 * from ringGeometry), so this view always previews the exact footprint that
 * gets manufactured.
 */

// ——— palette mirrored from cityMapStyle.ts ———
const BACKDROP = "#eef5fc"; // pale blue-white, so the shaped plate reads
const GROUND = "#b9c2cc"; // silver-blue plate
const RIM = "#9cc0e8"; // light blue edge line
const BUILDING_STOPS: Array<[number, string]> = [
  [0, "#b9d7f2"], // low-rise: light blue
  [60, "#cde3f8"],
  [180, "#e6f2fd"], // skyscrapers: near-white blue
];
const WORLD = 100; // world units across the sampled area

function buildingColor(heightM: number): THREE.Color {
  const [h0, c0] = BUILDING_STOPS[0];
  let lo = { h: h0, c: new THREE.Color(c0) };
  for (const [h, c] of BUILDING_STOPS) {
    if (heightM >= h) lo = { h, c: new THREE.Color(c) };
    else {
      const t = (heightM - lo.h) / (h - lo.h || 1);
      return lo.c.lerp(new THREE.Color(c), Math.max(0, Math.min(1, t)));
    }
  }
  return lo.c;
}

/** Constant per-vertex color attribute so everything merges into one mesh. */
function paint(geo: THREE.BufferGeometry, color: THREE.Color) {
  const n = geo.getAttribute("position").count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([color.r, color.g, color.b], i * 3);
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
}

interface CityViewerProps {
  buildings: BuildingPolygon[] | null;
  streets: StreetLine[] | null;
  shape: Shape;
  lat: number;
  lng: number;
  areaKm: number;
  /** plate side in mm — sets the scale for thickness and relief */
  widthMm: number;
  /** base thickness in mm (the "Base thickness" slider) */
  thicknessMm: number;
  /** max relief height in mm (the "Relief depth" slider) — the tallest
      building in the frame reaches this, everything else proportional */
  reliefMm: number;
  /** Pendant bail anchor in the normalized [-0.5, 0.5] plane; null hides it. */
  hang?: { x: number; z: number } | null;
  /** Bail loop scale multiplier — default 1. */
  hangSize?: number;
  /** Bail loop yaw offset in degrees, added atop the outward-facing angle. */
  hangRotation?: number;
  /** Rotate bail 90° for chain attachment (perpendicular to plate surface). */
  hangHorizontal?: boolean;
}

export function CityViewer({
  buildings, streets, shape, lat, lng, areaKm, widthMm, thicknessMm, reliefMm,
  hang, hangSize = 1, hangRotation = 0, hangHorizontal = false,
}: CityViewerProps) {
  // lat/lng → the same normalized plane the mesh builders sample:
  // x = (lng-west)/dLng - 0.5 (east), z = (lat-south)/dLat - 0.5. World
  // coordinates keep this z axis (like the metal mesh), so the heart's
  // orientation matches the cast piece exactly.
  const dLat = areaKm / 111;
  const dLng = areaKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  const south = lat - dLat / 2;
  const west = lng - dLng / 2;
  const nx = (lo: number) => (lo - west) / dLng - 0.5;
  const nz = (la: number) => (la - south) / dLat - 0.5;
  const mToU = WORLD / (areaKm * 1000); // metres → world units

  const outline = useMemo<Pt[]>(() => shapeOutline(shape), [shape]);
  const inside = makeInside(shape, outline);
  const clipToBoundary = makeClipToBoundary(inside);

  const buildingGeo = useMemo(() => {
    if (!buildings?.length) return null;
    // Soft-knee relief scaling shared with the STL: typical buildings spread
    // over most of the relief, outlier landmarks compress into the top band.
    const scale = makeHeightScale(buildings.map((b) => b.height));
    const reliefWorld = (reliefMm / widthMm) * WORLD;
    const parts: THREE.BufferGeometry[] = [];
    for (const b of buildings) {
      // Strict clip: a building is drawn only if its whole footprint lies
      // inside the plate outline, so nothing overhangs the canvas edge.
      let allIn = true;
      const pts: Array<{ x: number; y: number }> = [];
      for (const [la, lo] of b.ring) {
        const x = nx(lo), z = nz(la);
        if (!inside(x, z)) { allIn = false; break; }
        // ExtrudeGeometry + rotateX(-π/2) maps shape (x, y) → world (x, -y),
        // so shape.y = -worldZ.
        pts.push({ x: x * WORLD, y: -z * WORLD });
      }
      if (!allIn || pts.length < 3) continue;

      const hWorld = Math.max(scale(b.height) * reliefWorld, 0.15);
      const color = buildingColor(b.height);
      if (b.tower) {
        // Landmark tower: stack tapered slices of the footprint (spire).
        let cx = 0, cy = 0;
        for (const p of pts) { cx += p.x; cy += p.y; }
        cx /= pts.length; cy /= pts.length;
        for (const { t0, t1, s } of TOWER_PROFILE) {
          const sh = new THREE.Shape(
            pts.map((p) => new THREE.Vector2(cx + (p.x - cx) * s, cy + (p.y - cy) * s)),
          );
          const geo = new THREE.ExtrudeGeometry(sh, {
            depth: (t1 - t0) * hWorld * 1.02, // slight overlap between slices
            bevelEnabled: false,
          });
          geo.translate(0, 0, t0 * hWorld); // pre-rotation: extrude axis = up
          paint(geo, color);
          parts.push(geo);
        }
      } else {
        const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, p.y)));
        const geo = new THREE.ExtrudeGeometry(sh, { depth: hWorld, bevelEnabled: false });
        paint(geo, color);
        parts.push(geo);
      }
    }
    if (!parts.length) return null;
    const merged = mergeGeometries(parts, false);
    parts.forEach((g) => g.dispose());
    if (!merged) return null;
    merged.rotateX(-Math.PI / 2);
    merged.computeVertexNormals();
    return merged;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildings, shape, lat, lng, areaKm, reliefMm, widthMm]);

  const roadGeo = useMemo(() => {
    if (!streets?.length) return null;
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    for (const st of streets) {
      const style = ROAD_STYLES[st.cls] ?? ROAD_DEFAULT;
      const c = new THREE.Color(style.color);
      const half = Math.max(style.widthM * mToU, 0.12) / 2;
      const y = 0.02 + style.lift * 0.025; // stack classes to avoid z-fighting
      for (let i = 1; i < st.pts.length; i++) {
        let ax = nx(st.pts[i - 1][1]), az = nz(st.pts[i - 1][0]);
        let bx = nx(st.pts[i][1]), bz = nz(st.pts[i][0]);
        // Clip segments at the outline: roads end exactly at the plate edge
        // instead of poking past it (or leaving gaps short of it).
        const aIn = inside(ax, az), bIn = inside(bx, bz);
        if (!aIn && !bIn) continue;
        if (!bIn) { const p = clipToBoundary(ax, az, bx, bz); bx = p.x; bz = p.z; }
        else if (!aIn) { const p = clipToBoundary(bx, bz, ax, az); ax = p.x; az = p.z; }
        const dx = (bx - ax) * WORLD, dz = (bz - az) * WORLD;
        const len = Math.hypot(dx, dz);
        if (len === 0) continue;
        const ox = (-dz / len) * half, oz = (dx / len) * half;
        const base = pos.length / 3;
        pos.push(
          ax * WORLD + ox, y, az * WORLD + oz,
          ax * WORLD - ox, y, az * WORLD - oz,
          bx * WORLD + ox, y, bz * WORLD + oz,
          bx * WORLD - ox, y, bz * WORLD - oz,
        );
        for (let k = 0; k < 4; k++) col.push(c.r, c.g, c.b);
        idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      }
    }
    if (!pos.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(col), 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streets, shape, lat, lng, areaKm]);

  // Shaped ground plate + rim, matching the piece's outline. The plate is a
  // real slab: its thickness follows the "Base thickness" slider at true
  // scale (thickness mm relative to the plate side), growing downward so the
  // city surface stays at y = 0.
  const plateH = (thicknessMm / widthMm) * WORLD;
  const groundGeo = useMemo(() => {
    const s = new THREE.Shape();
    outline.forEach((p, i) => {
      if (i === 0) s.moveTo(p.x * WORLD, -p.z * WORLD);
      else s.lineTo(p.x * WORLD, -p.z * WORLD);
    });
    const geo = new THREE.ExtrudeGeometry(s, { depth: plateH, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -plateH, 0);
    return geo;
  }, [outline, plateH]);
  const rimGeo = useMemo(() => {
    const pts = [...outline, outline[0]].map((p) => new THREE.Vector3(p.x * WORLD, 0.01, p.z * WORLD));
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [outline]);

  // Pendant bail — the same drop loop RingViewer shows on the metal piece,
  // here in the map's plate silver so the hang point previews in this view
  // too. Mid-height of the plate side, tip into the wall. Preview-only.
  const bailR = WORLD * 0.075 * hangSize;
  const bailTube = bailR * 0.4;
  const bailCurve = useMemo(() => new DropBailCurve(bailR), [bailR]);
  const outLen = hang ? Math.hypot(hang.x, hang.z) || 1 : 1;
  const ox = hang ? hang.x / outLen : 0;
  const oz = hang ? hang.z / outLen : 1;

  useEffect(() => () => buildingGeo?.dispose(), [buildingGeo]);
  useEffect(() => () => roadGeo?.dispose(), [roadGeo]);
  useEffect(() => () => groundGeo.dispose(), [groundGeo]);
  useEffect(() => () => rimGeo.dispose(), [rimGeo]);

  return (
    <Canvas
      camera={{ position: [18, 62, 80], fov: 38 }}
      gl={{ antialias: true }}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <color attach="background" args={[BACKDROP]} />
      {/* soft viewport light, like the map style's `light` */}
      <hemisphereLight args={["#ffffff", "#c8ccd2", 0.9]} />
      <directionalLight position={[40, 80, 20]} intensity={0.55} />
      <mesh geometry={groundGeo} position={[0, -0.01, 0]}>
        <meshLambertMaterial color={GROUND} />
      </mesh>
      <lineLoop geometry={rimGeo}>
        <lineBasicMaterial color={RIM} />
      </lineLoop>
      {hang && (
        <mesh
          position={[
            hang.x * WORLD + ox * bailR * 0.75,
            -plateH / 2,
            hang.z * WORLD + oz * bailR * 0.75,
          ]}
          // YXZ: roll upright around the tip axis first, then yaw outward —
          // same chain-ready orientation as RingViewer.
          rotation={[
            hangHorizontal ? Math.PI / 2 : 0,
            Math.atan2(oz, -ox) + (hangRotation * Math.PI) / 180,
            0,
            "YXZ",
          ]}
        >
          <tubeGeometry args={[bailCurve, 48, bailTube, 10, true]} />
          <meshLambertMaterial color={GROUND} />
        </mesh>
      )}
      {roadGeo && (
        <mesh geometry={roadGeo}>
          <meshBasicMaterial vertexColors />
        </mesh>
      )}
      {buildingGeo && (
        <mesh geometry={buildingGeo}>
          <meshLambertMaterial vertexColors />
        </mesh>
      )}
      <OrbitControls
        enablePan={false}
        minDistance={25}
        maxDistance={260}
        maxPolarAngle={Math.PI * 0.46}
      />
    </Canvas>
  );
}

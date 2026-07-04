import * as THREE from "three";
import type { CityData } from "../api/fetchCity";
import type { RingMeshData } from "@/shared/lib/ringGeometry";

export interface CityMeshOptions {
  lat: number;
  lng: number;
  areaKm: number;
  /** plate side in mm */
  plateMm: number;
  /** base thickness in mm */
  baseMm: number;
  /** vertical exaggeration of building heights */
  vScale: number;
}

export interface CityMesh {
  buildings: THREE.BufferGeometry;
  roads: THREE.BufferGeometry | null;
  water: THREE.BufferGeometry | null;
  green: THREE.BufferGeometry | null;
  base: THREE.BufferGeometry;
  /** half-extent of the plate in mm (for camera framing) */
  half: number;
  /** approximate solid volume in mm³ (buildings + base) for pricing */
  volumeMm3: number;
  /** merged buildings + base as indexed mesh data for STL export */
  exportData: RingMeshData;
}

/** Road ribbon half-width in mm by Mapbox road class. */
function roadHalfWidth(cls: string): number {
  switch (cls) {
    case "motorway":
    case "motorway_link":
    case "trunk": return 0.45;
    case "primary": return 0.38;
    case "secondary": return 0.30;
    case "tertiary": return 0.25;
    case "street":
    case "street_limited": return 0.19;
    default: return 0.15;
  }
}

/** Stroke a polyline (mm [x,z]) into a flat ribbon at height y, appending tris. */
function ribbon(pts: Array<[number, number]>, halfW: number, y: number, out: number[]): void {
  if (pts.length < 2) return;
  const left: Array<[number, number]> = [];
  const right: Array<[number, number]> = [];
  for (let i = 0; i < pts.length; i++) {
    let dx = 0, dz = 0;
    if (i > 0) { dx += pts[i][0] - pts[i - 1][0]; dz += pts[i][1] - pts[i - 1][1]; }
    if (i < pts.length - 1) { dx += pts[i + 1][0] - pts[i][0]; dz += pts[i + 1][1] - pts[i][1]; }
    const len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * halfW, nz = (dx / len) * halfW;
    left.push([pts[i][0] + nx, pts[i][1] + nz]);
    right.push([pts[i][0] - nx, pts[i][1] - nz]);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const l0 = left[i], l1 = left[i + 1], r0 = right[i], r1 = right[i + 1];
    out.push(l0[0], y, l0[1], r0[0], y, r0[1], l1[0], y, l1[1]);
    out.push(l1[0], y, l1[1], r0[0], y, r0[1], r1[0], y, r1[1]);
  }
}

/** Shoelace area of a polygon in mm² (absolute). */
function polyArea(pts: Array<[number, number]>): number {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  }
  return Math.abs(a) / 2;
}

/** Append a geometry's triangles (de-indexed) into a flat positions array. */
function appendPositions(geo: THREE.BufferGeometry, target: number[]): void {
  const ni = geo.index ? geo.toNonIndexed() : geo;
  const arr = ni.attributes.position.array as ArrayLike<number>;
  for (let i = 0; i < arr.length; i++) target.push(arr[i]);
  if (ni !== geo) ni.dispose();
}

function geometryFromPositions(pos: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}

function shapeFrom(pts: Array<[number, number]>): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  return shape;
}

/**
 * Build a 3D mini-skyline: every building footprint extruded to its height on a
 * base plate, with water and green areas as flat colored insets. Coordinates are
 * projected to a local mm frame centred on the point (x east, z north, y up).
 */
export function buildCityMesh(city: CityData, o: CityMeshOptions): CityMesh {
  const mPerLat = 111320;
  const mPerLng = 111320 * Math.cos((o.lat * Math.PI) / 180) || 1;
  const scale = o.plateMm / (o.areaKm * 1000); // mm per metre (horizontal)
  const half = o.plateMm / 2;

  // lat/lng -> [x, z] in mm, clamped to the plate so nothing overhangs.
  const project = (la: number, lo: number): [number, number] => [
    Math.max(-half, Math.min(half, (lo - o.lng) * mPerLng * scale)),
    Math.max(-half, Math.min(half, (la - o.lat) * mPerLat * scale)),
  ];

  const buildPos: number[] = [];
  let volume = 0;

  // Cap very dense cities (keep the tallest) so extrusion stays responsive.
  const MAX_BUILDINGS = 3500;
  const buildings =
    city.buildings.length > MAX_BUILDINGS
      ? [...city.buildings].sort((a, b) => b.height - a.height).slice(0, MAX_BUILDINGS)
      : city.buildings;

  for (const b of buildings) {
    if (b.ring.length < 3) continue;
    const pts = b.ring.map(([la, lo]) => project(la, lo));
    const h = Math.max(0.6, b.height * scale * o.vScale); // mm, exaggerated
    const geo = new THREE.ExtrudeGeometry(shapeFrom(pts), { depth: h, bevelEnabled: false, steps: 1 });
    geo.rotateX(-Math.PI / 2); // XY-extrude-Z  ->  XZ footprint, +Y height
    appendPositions(geo, buildPos);
    geo.dispose();
    volume += polyArea(pts) * h;
  }

  const flat = (rings: Array<Array<[number, number]>>, y: number): THREE.BufferGeometry | null => {
    const pos: number[] = [];
    for (const ring of rings) {
      if (ring.length < 3) continue;
      const pts = ring.map(([la, lo]) => project(la, lo));
      const geo = new THREE.ShapeGeometry(shapeFrom(pts));
      geo.rotateX(-Math.PI / 2); // flat in XZ at y = 0
      geo.translate(0, y, 0);
      appendPositions(geo, pos);
      geo.dispose();
    }
    return pos.length ? geometryFromPositions(pos) : null;
  };

  // Roads: flat ribbons sitting just above the base (visible in the gaps).
  const roadPos: number[] = [];
  for (const road of city.roads) {
    const pts = road.pts.map(([la, lo]) => project(la, lo));
    ribbon(pts, roadHalfWidth(road.cls), 0.08, roadPos);
  }

  // Base plate (top at y = 0, extends down by baseMm).
  const baseBox = new THREE.BoxGeometry(o.plateMm, o.baseMm, o.plateMm);
  baseBox.translate(0, -o.baseMm / 2, 0);
  const basePos: number[] = [];
  appendPositions(baseBox, basePos);
  baseBox.dispose();
  volume += o.plateMm * o.plateMm * o.baseMm;

  // Export mesh = buildings + base, de-indexed -> sequential indices.
  const exportPos = new Float32Array(buildPos.length + basePos.length);
  exportPos.set(buildPos, 0);
  exportPos.set(basePos, buildPos.length);
  const exportIdx = new Uint32Array(exportPos.length / 3);
  for (let i = 0; i < exportIdx.length; i++) exportIdx[i] = i;

  return {
    buildings: geometryFromPositions(buildPos),
    roads: roadPos.length ? geometryFromPositions(roadPos) : null,
    water: flat(city.water, 0.05),
    green: flat(city.green, 0.04),
    base: geometryFromPositions(basePos),
    half,
    volumeMm3: volume,
    exportData: { positions: exportPos, indices: exportIdx },
  };
}

import * as THREE from "three";
import { pointInPolygon, unionPolygons, type Vec2 } from "@/shared/lib/geo2d";
import type { PendantDesign, SilhouetteInfo } from "../model/types";
import { contoursMm, pendantOutline } from "./geometry";

/** 3D pendant: the 2D outline extruded to the material thickness (chain hole
 *  punched through), plus the detected object contours embossed on the face
 *  as raised relief. Pendant space is y-down; THREE is y-up, so y is flipped.
 *  Units stay millimetres, origin at the pendant centre, z = 0 is the back. */

function ringToShape(ring: Vec2[]): THREE.Shape {
  return new THREE.Shape(ring.map((p) => new THREE.Vector2(p.x, -p.y)));
}

/** Traced contours carry sub-0.05 mm point spacing and can retrace themselves
 *  at thin spurs, which breaks earcut's cap triangulation — clean them with a
 *  self-union and drop near-duplicate vertices before extruding. */
function cleanRings(rings: Vec2[][], minStep = 0.05): Vec2[][] {
  return unionPolygons(rings)
    .map((ring) => {
      const out: Vec2[] = [];
      for (const p of ring) {
        const last = out[out.length - 1];
        if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= minStep) out.push(p);
      }
      return out;
    })
    .filter((ring) => ring.length >= 3);
}

export function buildPendant3D(
  design: PendantDesign,
  sil: SilhouetteInfo | null,
): THREE.BufferGeometry[] {
  const { config } = design;
  const geometries: THREE.BufferGeometry[] = [];

  for (const ring of pendantOutline(design, sil)) {
    if (ring.length < 3) continue;
    const shape = ringToShape(ring);
    // punch the chain hole through whichever ring contains it
    if (pointInPolygon({ x: config.hole.x, y: config.hole.y }, ring)) {
      shape.holes.push(
        new THREE.Path().absarc(
          config.hole.x,
          -config.hole.y,
          config.hole.diameter / 2,
          0,
          Math.PI * 2,
          true,
        ),
      );
    }
    geometries.push(
      new THREE.ExtrudeGeometry(shape, {
        depth: config.thickness,
        curveSegments: 24,
        // bevelOffset = -bevelSize keeps the outline dimensionally exact while
        // the edges catch specular light (a flat face is invisible against
        // another flat face under the same normals)
        bevelEnabled: true,
        bevelThickness: Math.min(0.12, config.thickness / 4),
        bevelSize: 0.1,
        bevelOffset: -0.1,
        bevelSegments: 2,
      }),
    );
  }

  if (sil && config.relief > 0) {
    for (const contour of cleanRings(contoursMm(sil, design.object))) {
      const geo = new THREE.ExtrudeGeometry(ringToShape(contour), {
        depth: config.relief,
        bevelEnabled: true,
        bevelThickness: Math.min(0.15, config.relief / 3),
        bevelSize: 0.1,
        bevelOffset: -0.1,
        bevelSegments: 2,
      });
      geo.translate(0, 0, config.thickness);
      geometries.push(geo);
    }
  }

  return geometries;
}

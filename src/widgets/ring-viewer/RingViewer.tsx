import { useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { FRAME_HEIGHT_MM, buildRingBandMesh, ringBandDims, type SlabParams } from "@/shared/lib/ringGeometry";
import { rotateHeightField } from "@/shared/lib/heightField";
import { DropBailCurve } from "@/shared/lib/bailCurve";
import { EngravingText } from "@/shared/ui/EngravingText";
import { METALS, buildShapeMesh, isRing, type JewelryType, type Metal, type Shape } from "@/entities/ring/model/types";

function makeEnvMap(gl: THREE.WebGLRenderer): THREE.Texture {
  const W = 128, H = 512;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;

  // Studio sky-to-floor gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0.00, "#ffffff");
  sky.addColorStop(0.06, "#f4f7fa");
  sky.addColorStop(0.22, "#c8cfd7");
  sky.addColorStop(0.42, "#7c8289");
  sky.addColorStop(0.62, "#3d4249");
  sky.addColorStop(0.82, "#121519");
  sky.addColorStop(1.00, "#050607");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Key-light bloom centred at top for a sharp specular hot-spot
  const bloom = ctx.createRadialGradient(W * 0.5, 0, 0, W * 0.5, 0, H * 0.28);
  bloom.addColorStop(0.00, "rgba(255,255,255,1.0)");
  bloom.addColorStop(0.25, "rgba(248,251,254,0.7)");
  bloom.addColorStop(1.00, "rgba(255,255,255,0.0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, W, H * 0.28);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(gl);
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return env;
}

/** Reflection map for the metal. Drop the liquid-metal photo here (served from
    /public) to have the piece mirror it; absent, the procedural studio gradient
    is used instead. */
const REFLECTION_URL = "/textures/liquid-metal.jpg";

export function SceneEnvironment() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    // Start with the procedural studio gradient so the metal always has a
    // reflection, then swap in the liquid-metal photo once (and if) it loads.
    const fallback = makeEnvMap(gl);
    scene.environment = fallback;

    let mapped: THREE.Texture | null = null;
    let cancelled = false;
    new THREE.TextureLoader().load(
      REFLECTION_URL,
      (tex) => {
        if (cancelled) { tex.dispose(); return; }
        tex.mapping = THREE.EquirectangularReflectionMapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        const pmrem = new THREE.PMREMGenerator(gl);
        mapped = pmrem.fromEquirectangular(tex).texture;
        tex.dispose();
        pmrem.dispose();
        scene.environment = mapped;
        invalidate(); // frameloop="demand" — repaint with the new reflections
      },
      undefined,
      () => { /* file absent → keep the procedural fallback, no error surfaced */ },
    );

    return () => {
      cancelled = true;
      scene.environment = null;
      fallback.dispose();
      mapped?.dispose();
    };
  }, [gl, scene, invalidate]);
  return null;
}

interface RingMeshProps {
  heightNorm: Float32Array | null;
  shape: Shape;
  params: SlabParams;
  metal: Metal;
  /** Bail anchors in the normalized [-0.5, 0.5] plane; empty hides them.
      Pendant = one, bracelet = two parallel (left + right). */
  hangs?: { x: number; z: number }[];
  /** Bail loop scale multiplier — default 1. */
  hangSize?: number;
  /** Bail loop yaw offset in degrees, added atop the outward-facing angle. */
  hangRotation?: number;
  /** Rotate bail 90° for chain attachment (perpendicular to plate surface). */
  hangHorizontal?: boolean;
  /** What the piece is worn as. "ring" swaps the bail/frame for a flat shank
      band under the plaque; everything else keeps the bezel + bail. */
  jewelryType?: JewelryType;
  /** Ring only — yaw of the plaque on the band, in degrees. */
  ringRotation?: number;
  /** Laser-engraving text — previewed on the back (pendant/bracelet) or inside
      the band (ring). Blank hides it. Not part of the exported mesh. */
  engraving?: string;
}

/**
 * Mostly-faithful height curve: keeps the real DEM profile (so the silhouette
 * stays recognizable — Ararat's twin cone, Everest's Lhotse/Nuptse ridges) and
 * adds just a touch of smoothstep so the dominant summit reads clearly in metal.
 */
function contrastCurve(h: Float32Array): Float32Array {
  const out = new Float32Array(h.length);
  for (let i = 0; i < h.length; i++) {
    const v = h[i];
    const smooth = v * v * (3 - 2 * v);
    out[i] = v * 0.72 + smooth * 0.28;
  }
  return out;
}

function RingMesh({ heightNorm, shape, params, metal, hangs = [], hangSize = 1, hangRotation = 0, hangHorizontal = false, jewelryType = "pendant", ringRotation = 0, engraving = "" }: RingMeshProps) {
  const ring = isRing(jewelryType);
  // Rings show the raw relief — the smoothstep contrast curve is skipped so the
  // profile matches the exported/priced mesh exactly.
  const heightContrast = useMemo(
    () => (heightNorm ? (ring ? heightNorm : contrastCurve(heightNorm)) : null),
    [heightNorm, ring],
  );

  // `offset` is what geo.center() subtracted — the bail marker is positioned
  // in mesh mm-coordinates and shifted by the same amount to stay attached.
  const { geometry, offset } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    if (!heightContrast) return { geometry: geo, offset: new THREE.Vector3() };
    // Orientation: pendant/bracelet rotate the relief field so the frame +
    // outline stay fixed and only the inner design turns. Rings have no frame
    // and yaw the whole plaque group instead (below), so keep the field as-is.
    const field = ring ? heightContrast : rotateHeightField(heightContrast, ringRotation);
    const { positions, indices } = buildShapeMesh(shape, field, params);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    const c = geo.boundingBox!.getCenter(new THREE.Vector3());
    geo.center();
    return { geometry: geo, offset: c };
  }, [heightContrast, shape, params, ring, ringRotation]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(() => {
    const spec = METALS[metal];
    return new THREE.MeshStandardMaterial({
      color: spec.color,
      metalness: 1.0,
      roughness: spec.roughness,
      envMapIntensity: 1.8,
    });
  }, [metal]);

  useEffect(() => () => material.dispose(), [material]);

  const ringBand = useMemo(() => {
    if (!ring) return null;
    const dims = ringBandDims(params.width);
    const { positions, indices } = buildRingBandMesh(dims);
    const topLocalY = dims.innerR + dims.wall;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    return { geo, topLocalY, innerR: dims.innerR };
  }, [ring, params.width]);
  useEffect(() => () => ringBand?.geo.dispose(), [ringBand]);

  // Pendant bail: a HORIZONTAL water-drop loop protruding from the outer
  // side face at the hang point, at mid-height of the side — pointed tip
  // into the wall, round end out. Same metal as the piece. Preview-only —
  // not part of the exported mesh.
  const bailR = params.width * 0.095 * hangSize;
  const bailTube = bailR * 0.2;
  const bailCurve = useMemo(() => new DropBailCurve(bailR), [bailR]);
  return (
    <>
      {/* Orientation: a ring yaws the whole plaque on its band; pendant/bracelet
          keep the frame fixed and rotate only the relief field (built above). */}
      <group rotation={[0, ring ? (ringRotation * Math.PI) / 180 : 0, 0]}>
        <mesh geometry={geometry} material={material} />
      </group>
      {ringBand && (
        <mesh
          geometry={ringBand.geo}
          material={material}
          position={[0, -offset.y - ringBand.topLocalY, 0]}
        />
      )}
      {/* Laser engraving — inside the band for a ring, on the flat back face
          otherwise. Preview-only; the real mark is a post-cast laser step. */}
      {heightContrast && (ring
        ? ringBand && (
          <EngravingText
            text={engraving}
            position={[0, -offset.y - ringBand.topLocalY + ringBand.innerR - 0.06, 0]}
            curveRadius={ringBand.innerR}
            fontSize={Math.max(0.9, ringBand.innerR * 0.3)}
            color="#2b3038"
          />
        )
        : (
          <EngravingText
            text={engraving}
            position={[0, -offset.y - 0.05, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            fontSize={params.width * 0.085}
            maxWidth={params.width * 0.82}
            color="#2b3038"
          />
        ))}
      {heightContrast && hangs.map((hang, i) => {
        const outLen = Math.hypot(hang.x, hang.z) || 1;
        const ox = hang.x / outLen;
        const oz = hang.z / outLen;
        return (
          <mesh
            key={i}
            material={material}
            position={[
              hang.x * params.width + ox * bailR * 0.75 - offset.x,
              (params.base + FRAME_HEIGHT_MM) / 2 - offset.y,
              hang.z * params.depth + oz * bailR * 0.75 - offset.z,
            ]}
            // YXZ: roll the loop upright around its own tip axis first, then
            // yaw it outward — the chain hole stays tangent to the plate edge
            // on every side, so a chain threads straight through.
            rotation={[
              hangHorizontal ? Math.PI / 2 : 0,
              Math.atan2(oz, -ox) + (hangRotation * Math.PI) / 180,
              0,
              "YXZ",
            ]}
          >
            <tubeGeometry args={[bailCurve, 48, bailTube, 10, true]} />
          </mesh>
        );
      })}
    </>
  );
}

/**
 * When the user starts typing an engraving, swing the camera to the engraved
 * face (the flat underside for a pendant/bracelet, the inside of the band for a
 * ring) so the preview text is actually visible. Only fires on the empty→typed
 * transition, so it doesn't fight the user while they keep editing or orbit away.
 */
export function CameraDirector({ engraving = "", jewelryType = "pendant" }: { engraving?: string; jewelryType?: JewelryType }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const invalidate = useThree((s) => s.invalidate);
  const prev = useRef(engraving);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    const had = prev.current.trim().length > 0;
    const has = engraving.trim().length > 0;
    prev.current = engraving;
    if (!controls || !has || had) return;

    // Direction (from the piece centre toward the camera) that puts the
    // engraved face toward the viewer — below-front, more so for a ring whose
    // text wraps the inner band wall. Keep the user's current zoom distance.
    const dir = (isRing(jewelryType)
      ? new THREE.Vector3(0.1, -0.55, 0.83)
      : new THREE.Vector3(0.12, -0.86, 0.5)
    ).normalize();
    const R = camera.position.distanceTo(controls.target);
    const to = dir.multiplyScalar(R).add(controls.target);
    const from = camera.position.clone();
    const start = performance.now();
    const DUR = 700;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DUR);
      const e = t * t * (3 - 2 * t); // smoothstep ease
      camera.position.lerpVectors(from, to, e);
      controls.update();
      invalidate(); // frameloop="demand" — repaint each animation frame
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [engraving, controls, camera, invalidate, jewelryType]);

  return null;
}

export function RingViewer(props: RingMeshProps) {
  return (
    <Canvas
      // Remount on shape change so the camera/orbit reset to a fitting framing.
      key={props.shape}
      // Render only on interaction / prop change — no idle auto-spin loop.
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [22, 34, 42], fov: 36 }}
      gl={{ alpha: true, antialias: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.2;
      }}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <hemisphereLight args={[0xfff8f0, 0x14100c, 0.35]} />
      {/* Key: warm, upper-right-front */}
      <directionalLight position={[8, 14, 6]} intensity={2.8} color={0xfff8f0} />
      {/* Fill: cool-blue, left */}
      <directionalLight position={[-10, 2, 4]} intensity={0.5} color={0xd0e0ff} />
      {/* Rim: back-top catch-light */}
      <directionalLight position={[-1, 10, -12]} intensity={1.1} color={0xffe8d0} />
      <SceneEnvironment />
      <RingMesh {...props} />
      <CameraDirector engraving={props.engraving} jewelryType={props.jewelryType} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={28}
        maxDistance={90}
        // Allow tilting past the equator so the flat back / inside of the band
        // (where the engraving sits) can be inspected — stop just shy of the
        // pole to avoid the gimbal flip when looking straight up.
        maxPolarAngle={Math.PI * 0.95}
      />
    </Canvas>
  );
}

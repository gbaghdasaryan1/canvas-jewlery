import { useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { FRAME_HEIGHT_MM, type SlabParams } from "@/shared/lib/ringGeometry";
import { DropBailCurve } from "@/shared/lib/bailCurve";
import { METALS, buildShapeMesh, type Metal, type Shape } from "@/entities/ring/model/types";

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

function SceneEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const env = makeEnvMap(gl);
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene]);
  return null;
}

interface RingMeshProps {
  heightNorm: Float32Array | null;
  shape: Shape;
  params: SlabParams;
  metal: Metal;
  /** Pendant bail anchor in the normalized [-0.5, 0.5] plane; null hides it. */
  hang?: { x: number; z: number } | null;
  /** Bail loop scale multiplier — default 1. */
  hangSize?: number;
  /** Bail loop yaw offset in degrees, added atop the outward-facing angle. */
  hangRotation?: number;
  /** Rotate bail 90° for chain attachment (perpendicular to plate surface). */
  hangHorizontal?: boolean;
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

function RingMesh({ heightNorm, shape, params, metal, hang, hangSize = 1, hangRotation = 0, hangHorizontal = false }: RingMeshProps) {
  const heightContrast = useMemo(
    () => (heightNorm ? contrastCurve(heightNorm) : null),
    [heightNorm],
  );

  // `offset` is what geo.center() subtracted — the bail marker is positioned
  // in mesh mm-coordinates and shifted by the same amount to stay attached.
  const { geometry, offset } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    if (!heightContrast) return { geometry: geo, offset: new THREE.Vector3() };
    const { positions, indices } = buildShapeMesh(shape, heightContrast, params);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    const c = geo.boundingBox!.getCenter(new THREE.Vector3());
    geo.center();
    return { geometry: geo, offset: c };
  }, [heightContrast, shape, params]);

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

  // Pendant bail: a HORIZONTAL water-drop loop protruding from the outer
  // side face at the hang point, at mid-height of the side — pointed tip
  // into the wall, round end out. Same metal as the piece. Preview-only —
  // not part of the exported mesh.
  const bailR = params.width * 0.075 * hangSize;
  const bailTube = bailR * 0.4;
  const bailCurve = useMemo(() => new DropBailCurve(bailR), [bailR]);
  const outLen = hang ? Math.hypot(hang.x, hang.z) || 1 : 1;
  const ox = hang ? hang.x / outLen : 0;
  const oz = hang ? hang.z / outLen : 1;
  return (
    <>
      <mesh geometry={geometry} material={material} />
      {hang && heightContrast && (
        <mesh
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
      )}
    </>
  );
}

export function RingViewer(props: RingMeshProps) {
  return (
    <Canvas
      // Remount on shape change so the camera/orbit reset to a fitting framing.
      key={props.shape}
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
      <OrbitControls
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.8}
        minDistance={28}
        maxDistance={90}
        maxPolarAngle={Math.PI * 0.49}
      />
    </Canvas>
  );
}

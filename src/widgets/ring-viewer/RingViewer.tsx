import { useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { type SlabParams } from "@/shared/lib/ringGeometry";
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

function RingMesh({ heightNorm, shape, params, metal }: RingMeshProps) {
  const heightContrast = useMemo(
    () => (heightNorm ? contrastCurve(heightNorm) : null),
    [heightNorm],
  );

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    if (!heightContrast) return geo;
    const { positions, indices } = buildShapeMesh(shape, heightContrast, params);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    geo.center();
    return geo;
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

  return <mesh geometry={geometry} material={material} />;
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
      <directionalLight position={[8, 14, 6]}   intensity={2.8} color={0xfff8f0} />
      {/* Fill: cool-blue, left */}
      <directionalLight position={[-10, 2, 4]}  intensity={0.5} color={0xd0e0ff} />
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

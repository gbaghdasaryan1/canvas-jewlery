import { useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import styled from "styled-components";
import { METALS } from "@/entities/ring/model/types";
import { buildPendant3D } from "@/entities/pendant/lib/pendant3d";
import { usePendant } from "../model/store";

const ViewerHost = styled.div`
  position: absolute;
  inset: 0;
  background: #0f1114;
`;

/** Studio gradient + key-light bloom env map — same treatment as
 *  widgets/ring-viewer so pendants read as the same silver. */
function makeEnvMap(gl: THREE.WebGLRenderer): THREE.Texture {
  const W = 128,
    H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0.0, "#ffffff");
  sky.addColorStop(0.06, "#f4f7fa");
  sky.addColorStop(0.22, "#c8cfd7");
  sky.addColorStop(0.42, "#7c8289");
  sky.addColorStop(0.62, "#3d4249");
  sky.addColorStop(0.82, "#121519");
  sky.addColorStop(1.0, "#050607");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const bloom = ctx.createRadialGradient(W * 0.5, 0, 0, W * 0.5, 0, H * 0.28);
  bloom.addColorStop(0.0, "rgba(255,255,255,1.0)");
  bloom.addColorStop(0.25, "rgba(248,251,254,0.7)");
  bloom.addColorStop(1.0, "rgba(255,255,255,0.0)");
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

function PendantMeshes() {
  const design = usePendant((s) => s.design);
  const silhouette = usePendant((s) => s.silhouette);
  const importedStl = usePendant((s) => s.importedStl);

  const geometries = useMemo(
    () => (importedStl ? [importedStl.geometry] : buildPendant3D(design, silhouette)),
    [importedStl, design, silhouette],
  );

  // imported geometry belongs to the store (disposed there); built ones are ours
  useEffect(
    () => () => {
      if (!importedStl) geometries.forEach((g) => g.dispose());
    },
    [geometries, importedStl],
  );

  const material = useMemo(() => {
    const spec = METALS.silver;
    return new THREE.MeshStandardMaterial({
      color: spec.color,
      metalness: 1.0,
      roughness: spec.roughness,
      envMapIntensity: 1.8,
      // traced contours arrive in either winding — don't cull
      side: THREE.DoubleSide,
    });
  }, []);
  useEffect(() => () => material.dispose(), [material]);

  // centre the whole piece at the origin so orbiting feels natural
  const center = useMemo(() => {
    const box = new THREE.Box3();
    for (const g of geometries) {
      g.computeBoundingBox();
      if (g.boundingBox) box.union(g.boundingBox);
    }
    return box.getCenter(new THREE.Vector3());
  }, [geometries]);

  return (
    <group position={[-center.x, -center.y, -center.z]}>
      {geometries.map((g, i) => (
        <mesh key={i} geometry={g} material={material} />
      ))}
    </group>
  );
}

/** Live 3D preview: the designed pendant extruded (body + embossed relief) or
 *  a user-imported STL, in the studio-silver look of the other viewers. */
export function Pendant3DViewer() {
  const importedStl = usePendant((s) => s.importedStl);
  const width = usePendant((s) => s.design.config.width);

  // frame the camera to the model's rough radius
  const radius = importedStl
    ? Math.max(importedStl.size.x, importedStl.size.y, importedStl.size.z) / 2 || 20
    : width / 2;
  const dist = Math.max(24, radius * 3.2);

  return (
    <ViewerHost>
      <Canvas
        // remount when the subject changes so the camera reframes
        key={`${importedStl ? importedStl.name : "design"}-${Math.round(dist)}`}
        camera={{ position: [dist * 0.5, dist * 0.55, dist * 0.85], fov: 36 }}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
        }}
      >
        <hemisphereLight args={[0xfff8f0, 0x14100c, 0.35]} />
        <directionalLight position={[8, 14, 6]} intensity={2.8} color={0xfff8f0} />
        <directionalLight position={[-10, 2, 4]} intensity={0.5} color={0xd0e0ff} />
        <directionalLight position={[-1, 10, -12]} intensity={1.1} color={0xffe8d0} />
        <SceneEnvironment />
        <PendantMeshes />
        <OrbitControls
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.8}
          minDistance={dist * 0.4}
          maxDistance={dist * 3}
        />
      </Canvas>
    </ViewerHost>
  );
}

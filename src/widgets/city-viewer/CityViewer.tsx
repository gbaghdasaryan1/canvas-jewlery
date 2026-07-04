import { useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { CityMesh } from "@/entities/city/lib/buildCityMesh";

function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.5, "#cfd4da");
    g.addColorStop(1, "#6b7079");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromEquirectangular(tex).texture;
    tex.dispose();
    pmrem.dispose();
    scene.environment = env;
    return () => { scene.environment = null; env.dispose(); };
  }, [gl, scene]);
  return null;
}

function CityModel({ mesh }: { mesh: CityMesh }) {
  const mats = useMemo(
    () => ({
      base: new THREE.MeshStandardMaterial({ color: 0xece7dd, roughness: 0.9, metalness: 0.0 }),
      buildings: new THREE.MeshStandardMaterial({ color: 0xd79a86, roughness: 0.7, metalness: 0.05 }),
      roads: new THREE.MeshStandardMaterial({ color: 0x4c4740, roughness: 0.85, metalness: 0.0, side: THREE.DoubleSide }),
      water: new THREE.MeshStandardMaterial({ color: 0x5b86c4, roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide }),
      green: new THREE.MeshStandardMaterial({ color: 0x82ad6a, roughness: 0.85, metalness: 0.0, side: THREE.DoubleSide }),
    }),
    [],
  );

  // Dispose geometries + materials when they change or unmount.
  useEffect(
    () => () => {
      mesh.buildings.dispose();
      mesh.base.dispose();
      mesh.roads?.dispose();
      mesh.water?.dispose();
      mesh.green?.dispose();
    },
    [mesh],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  return (
    <group>
      <mesh geometry={mesh.base} material={mats.base} />
      {mesh.green && <mesh geometry={mesh.green} material={mats.green} />}
      {mesh.water && <mesh geometry={mesh.water} material={mats.water} />}
      {mesh.roads && <mesh geometry={mesh.roads} material={mats.roads} />}
      <mesh geometry={mesh.buildings} material={mats.buildings} />
    </group>
  );
}

export function CityViewer({ mesh }: { mesh: CityMesh | null }) {
  const d = mesh ? mesh.half : 20;
  return (
    <Canvas
      camera={{ position: [d * 1.3, d * 1.25, d * 1.7], fov: 35 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <ambientLight intensity={0.5} />
      <hemisphereLight args={[0xffffff, 0x40454d, 0.5]} />
      <directionalLight position={[d * 1.5, d * 2.4, d * 1.0]} intensity={2.0} castShadow />
      <directionalLight position={[-d, d, -d * 1.4]} intensity={0.5} color={0xccd6ff} />
      <StudioEnvironment />
      {mesh && <CityModel mesh={mesh} />}
      <OrbitControls
        enablePan
        target={[0, d * 0.18, 0]}
        minDistance={d * 0.8}
        maxDistance={d * 5}
        maxPolarAngle={Math.PI * 0.49}
      />
    </Canvas>
  );
}

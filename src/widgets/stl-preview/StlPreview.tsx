import { useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { buildExportMesh, type ExportMeshInput } from "@/features/stl-export/buildExportMesh";
import { METALS, type Metal } from "@/entities/ring/model/types";
import { SceneEnvironment } from "@/widgets/ring-viewer/RingViewer";

interface StlPreviewProps extends ExportMeshInput {
  /** Metal finish — matched to the main viewer so the preview reads identically. */
  metal: Metal;
}

/**
 * A 3D preview of the *exact* solid that gets written to STL. It shares the
 * main viewer's studio environment, lights and PBR metal material, so the
 * surface colour matches the cast piece one-to-one.
 */
function PrintMesh({ metal, ...meshInput }: StlPreviewProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const mesh = buildExportMesh(meshInput);
    if (!mesh) return null;
    geo.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
    geo.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.center();
    return geo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    meshInput.shape, meshInput.heightNorm, meshInput.width, meshInput.relief, meshInput.thickness,
    meshInput.jewelryType, meshInput.hangPlace, meshInput.hangSize, meshInput.hangRotation,
    meshInput.hangHorizontal, meshInput.ringRotation, meshInput.exportMesh,
  ]);

  useEffect(() => () => geometry?.dispose(), [geometry]);

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

  if (!geometry) return null;
  return <mesh geometry={geometry} material={material} />;
}

export function StlPreview(props: StlPreviewProps) {
  return (
    <Canvas
      // Render only on interaction / prop change — no idle auto-spin loop.
      frameloop="demand"
      camera={{ position: [16, 22, 28], fov: 34 }}
      gl={{ alpha: true, antialias: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.2;
      }}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <hemisphereLight args={[0xfff8f0, 0x14100c, 0.35]} />
      <directionalLight position={[8, 14, 6]} intensity={2.8} color={0xfff8f0} />
      <directionalLight position={[-10, 2, 4]} intensity={0.5} color={0xd0e0ff} />
      <directionalLight position={[-1, 10, -12]} intensity={1.1} color={0xffe8d0} />
      <SceneEnvironment />
      <PrintMesh {...props} />
      <OrbitControls enablePan={false} minDistance={20} maxDistance={70} maxPolarAngle={Math.PI * 0.52} />
    </Canvas>
  );
}

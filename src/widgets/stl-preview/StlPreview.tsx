import { useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { buildExportMesh, type ExportMeshInput } from "@/features/stl-export/buildExportMesh";
import { METALS, isRing, type Metal } from "@/entities/ring/model/types";
import { ringBandDims } from "@/shared/lib/ringGeometry";
import { EngravingText } from "@/shared/ui/EngravingText";
import { CameraDirector, SceneEnvironment } from "@/widgets/ring-viewer/RingViewer";

interface StlPreviewProps extends ExportMeshInput {
  /** Metal finish — matched to the main viewer so the preview reads identically. */
  metal: Metal;
  /** Engraving text — previewed on the back / inside the band (not part of the
      exported solid; the mark is a post-cast laser step), and drives the same
      camera-swing-to-the-back behaviour as the main viewer when the user types. */
  engraving?: string;
}

/**
 * A 3D preview of the *exact* solid that gets written to STL. It shares the
 * main viewer's studio environment, lights, PBR metal material and engraving
 * overlay, so the surface reads one-to-one with the cast piece.
 */
function PrintMesh({ metal, engraving = "", ...meshInput }: StlPreviewProps) {
  const ring = isRing(meshInput.jewelryType);

  // Build + centre the solid, keeping the pre-centre bounding-box centre (cy)
  // and the centred bottom face (minY) so the engraving overlay can be seated
  // on the back plate / inside the band exactly like RingViewer + CityViewer.
  const built = useMemo(() => {
    const mesh = buildExportMesh(meshInput);
    if (!mesh) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
    geo.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    const cy = geo.boundingBox!.getCenter(new THREE.Vector3()).y;
    geo.center();
    geo.computeBoundingBox();
    return { geo, cy, minY: geo.boundingBox!.min.y };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    meshInput.shape, meshInput.heightNorm, meshInput.width, meshInput.relief, meshInput.thickness,
    meshInput.jewelryType, meshInput.hangPlace, meshInput.hangSize, meshInput.hangRotation,
    meshInput.hangHorizontal, meshInput.ringRotation, meshInput.exportMesh,
  ]);

  useEffect(() => () => built?.geo.dispose(), [built]);

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

  if (!built) return null;

  const { width } = meshInput;
  // Ring band geometry (only meaningful for a ring) — the engraving wraps its
  // inner wall. The band is fused with its top at the plate base and its centre
  // dropped by outerR, so in the centred mesh the inner wall sits here:
  const dims = ringBandDims(width);
  const outerR = dims.innerR + dims.wall;

  return (
    <>
      <mesh geometry={built.geo} material={material} />
      {ring ? (
        // Wrapped in the band's yaw (the skyline yaws its band by -ringRotation)
        // so the text tracks the band exactly.
        <group rotation={[0, -(meshInput.ringRotation * Math.PI) / 180, 0]}>
          <EngravingText
            text={engraving}
            position={[0, -outerR - built.cy + dims.innerR - width * 0.006, 0]}
            curveRadius={dims.innerR}
            fontSize={Math.max(0.9, dims.innerR * 0.3)}
            color="#2b3038"
          />
        </group>
      ) : (
        <EngravingText
          text={engraving}
          position={[0, built.minY - width * 0.004, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          fontSize={width * 0.085}
          maxWidth={width * 0.82}
          color="#2b3038"
        />
      )}
    </>
  );
}

export function StlPreview({ engraving, ...props }: StlPreviewProps) {
  return (
    <Canvas
      // Render only on interaction / prop change — no idle auto-spin loop.
      frameloop="demand"
      dpr={[1, 2]}
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
      <PrintMesh {...props} engraving={engraving} />
      <CameraDirector engraving={engraving} jewelryType={props.jewelryType} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={20}
        maxDistance={70}
        // Match the main viewer: tilt past the equator so the back plate /
        // inside of the band (the engraving side) can be inspected.
        maxPolarAngle={Math.PI * 0.95}
      />
    </Canvas>
  );
}

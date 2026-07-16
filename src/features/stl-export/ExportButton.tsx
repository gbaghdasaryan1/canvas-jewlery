import { useDesigner } from "@/app/store";
import { type Shape } from "@/entities/ring/model/types";
import { type RingMeshData } from "@/shared/lib/ringGeometry";
import { downloadSTL } from "@/shared/lib/stl";
import { slugify } from "@/shared/lib/format";
import { buildExportMesh } from "./buildExportMesh";

const SUFFIX: Record<Shape, string> = {
  rectangle: "plaque",
  heart: "heart",
  circle: "disc",
};

interface ExportButtonProps {
  /** Composed 0..1 heightfield — the same one the viewer renders. */
  heightNorm: Float32Array | null;
  /** Optional filename tag, e.g. "skyline" → cairn-yerevan-skyline-plaque.stl */
  tag?: string;
  /** Optional mesh built on demand just for the STL (e.g. the skyline's
      vector city mesh, so the file matches the canvas exactly). Falls back
      to the heightfield relief mesh. */
  exportMesh?: () => RingMeshData | null;
}

export function ExportButton({ heightNorm, tag, exportMesh }: ExportButtonProps) {
  const {
    shape, width, relief, thickness, name,
    jewelryType, hangPlace, hangSize, hangRotation, hangHorizontal,
  } = useDesigner();

  function exportStl() {
    const mesh = buildExportMesh({
      shape, heightNorm, width, relief, thickness,
      jewelryType, hangPlace, hangSize, hangRotation, hangHorizontal, exportMesh,
    });
    if (!mesh) return;
    const fileName = `cairn-${slugify(name)}-${tag ? `${tag}-` : ""}${SUFFIX[shape]}.stl`;
    downloadSTL(mesh, fileName);
  }

  return (
    <button className="btn" onClick={exportStl} disabled={!heightNorm}>
      Download STL
    </button>
  );
}

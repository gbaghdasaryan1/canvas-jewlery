import { useDesigner } from "@/app/store";
import { useElevation } from "@/entities/terrain/api/useElevation";
import { buildShapeMesh, toShapeParams, type Shape } from "@/entities/ring/model/types";
import { useBuildings } from "@/entities/buildings/api/useBuildings";
import { rasterizeBuildings } from "@/entities/buildings/lib/rasterizeBuildings";
import { useCity } from "@/entities/city/api/useCity";
import { buildCityMesh } from "@/entities/city/lib/buildCityMesh";
import { GRID } from "@/shared/config/presets";
import { composeHeightField } from "@/shared/lib/heightField";
import { downloadSTL } from "@/shared/lib/stl";
import { slugify } from "@/shared/lib/format";

const SUFFIX: Record<Shape, string> = {
  rectangle: "plaque",
  heart: "heart",
  circle: "disc",
  skyline: "skyline",
};

export function ExportButton() {
  const { lat, lng, shape, areaKm, width, relief, thickness, smooth, showBuildings, name } =
    useDesigner();
  const isSkyline = shape === "skyline";
  const { data: terrain } = useElevation(lat, lng, areaKm);
  const { data: buildings } = useBuildings(lat, lng, areaKm, showBuildings);
  const { data: city } = useCity(lat, lng, areaKm, isSkyline);

  function exportStl() {
    const fileName = `cairn-${slugify(name)}-${SUFFIX[shape]}.stl`;
    if (isSkyline) {
      if (!city) return;
      const { exportData } = buildCityMesh(city, {
        lat, lng, areaKm, plateMm: width, baseMm: thickness, vScale: relief,
      });
      downloadSTL(exportData, fileName);
      return;
    }
    if (!terrain) return;
    const structures =
      showBuildings && buildings?.length
        ? rasterizeBuildings(buildings, lat, lng, areaKm, GRID)
        : null;
    const height = composeHeightField(terrain.data, terrain.min, terrain.max, structures, smooth);
    const mesh = buildShapeMesh(shape, height, toShapeParams(shape, { width, relief, thickness }));
    downloadSTL(mesh, fileName);
  }

  return (
    <button className="btn" onClick={exportStl} disabled={isSkyline ? !city : !terrain}>
      Download STL
    </button>
  );
}

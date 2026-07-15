import { useEffect, useRef, useState } from "react";
import { buildDXF, buildProjectJSON, buildSVG, downloadCanvasPNG, downloadText } from "@/features/pendant-export/exporters";
import { downloadGeometrySTL } from "@/features/pendant-export/stl3d";
import { buildPendant3D } from "@/entities/pendant/lib/pendant3d";
import { usePendant } from "../model/store";
import { getStage } from "../model/stageRegistry";
import { Menu, MenuItem, MenuWrap, PrimaryButton, ToolButton, ToolDivider } from "./styles";

const ZOOM_STEP = 1.25;

/** Top toolbar: undo/redo, zoom controls, export menu. */
export function Toolbar() {
  const canUndo = usePendant((s) => s.past.length > 0);
  const canRedo = usePendant((s) => s.future.length > 0);
  const undo = usePendant((s) => s.undo);
  const redo = usePendant((s) => s.redo);
  const stageScale = usePendant((s) => s.stageScale);
  const setView = usePendant((s) => s.setView);
  const requestFit = usePendant((s) => s.requestFit);
  const hasDesign = usePendant((s) => s.silhouette !== null);
  const design = usePendant((s) => s.design);
  const silhouette = usePendant((s) => s.silhouette);
  const fileName = usePendant((s) => s.fileName);
  const viewMode = usePendant((s) => s.viewMode);
  const setViewMode = usePendant((s) => s.setViewMode);
  const importedStl = usePendant((s) => s.importedStl);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" && (target as HTMLInputElement).type === "number") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const zoomBy = (factor: number) => {
    const stage = getStage();
    const s = usePendant.getState();
    const next = Math.max(1, Math.min(80, s.stageScale * factor));
    if (!stage) {
      setView(next, s.stageX, s.stageY);
      return;
    }
    // zoom about the viewport centre
    const cx = stage.width() / 2;
    const cy = stage.height() / 2;
    const wx = (cx - s.stageX) / s.stageScale;
    const wy = (cy - s.stageY) / s.stageScale;
    setView(next, cx - wx * next, cy - wy * next);
  };

  const base = (fileName ?? "pendant").replace(/\.[^.]+$/, "");

  const exportAs = (kind: "svg" | "png" | "dxf" | "json" | "stl") => {
    setMenuOpen(false);
    switch (kind) {
      case "svg":
        downloadText(`${base}-pendant.svg`, "image/svg+xml", buildSVG(design, silhouette));
        break;
      case "png": {
        const canvas = getStage()?.toCanvas({ pixelRatio: 3 });
        if (canvas) downloadCanvasPNG(canvas, `${base}-pendant.png`);
        break;
      }
      case "stl": {
        const geos = importedStl
          ? [importedStl.geometry]
          : buildPendant3D(design, silhouette);
        downloadGeometrySTL(geos, `${base}-pendant.stl`);
        if (!importedStl) geos.forEach((g) => g.dispose());
        break;
      }
      case "dxf":
        downloadText(`${base}-pendant.dxf`, "application/dxf", buildDXF(design, silhouette));
        break;
      case "json":
        downloadText(
          `${base}-pendant.json`,
          "application/json",
          buildProjectJSON(design, silhouette, fileName),
        );
        break;
    }
  };

  return (
    <>
      <ToolButton
        $active={viewMode === "2d"}
        onClick={() => setViewMode("2d")}
        title="2D editor"
      >
        2D
      </ToolButton>
      <ToolButton
        $active={viewMode === "3d"}
        onClick={() => setViewMode("3d")}
        title="3D preview"
      >
        3D
      </ToolButton>
      <ToolDivider />
      <ToolButton onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">
        ↺
      </ToolButton>
      <ToolButton onClick={redo} disabled={!canRedo} title="Redo (⇧⌘Z)">
        ↻
      </ToolButton>
      <ToolDivider />
      <ToolButton onClick={() => zoomBy(1 / ZOOM_STEP)} title="Zoom out">
        −
      </ToolButton>
      <ToolButton onClick={() => zoomBy(ZOOM_STEP)} title="Zoom in">
        +
      </ToolButton>
      <ToolButton title="Zoom level" disabled>
        {Math.round(stageScale * 10)}%
      </ToolButton>
      <ToolButton onClick={requestFit} title="Fit pendant to screen">
        Fit
      </ToolButton>
      <ToolButton onClick={requestFit} title="Reset view">
        Reset
      </ToolButton>
      <ToolDivider />
      <MenuWrap ref={menuRef}>
        <PrimaryButton
          onClick={() => setMenuOpen((v) => !v)}
          disabled={!hasDesign && !importedStl}
        >
          Export ▾
        </PrimaryButton>
        {menuOpen && (
          <Menu>
            <MenuItem onClick={() => exportAs("stl")}>
              STL <span>3D print / cast</span>
            </MenuItem>
            <MenuItem onClick={() => exportAs("svg")} disabled={!hasDesign}>
              SVG <span>vector, mm</span>
            </MenuItem>
            <MenuItem onClick={() => exportAs("png")} disabled={viewMode !== "2d"}>
              PNG <span>3× raster</span>
            </MenuItem>
            <MenuItem onClick={() => exportAs("dxf")} disabled={!hasDesign}>
              DXF <span>placeholder</span>
            </MenuItem>
            <MenuItem onClick={() => exportAs("json")} disabled={!hasDesign}>
              JSON <span>project</span>
            </MenuItem>
          </Menu>
        )}
      </MenuWrap>
    </>
  );
}

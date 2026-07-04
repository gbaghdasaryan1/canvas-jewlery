import { useEffect } from "react";
import { useDesigner } from "@/app/store";
import type { Shape } from "@/entities/ring/model/types";
import { Designer } from "./Designer";

const VALID_SHAPES = new Set(["rectangle", "heart", "circle", "skyline"]);

/** The standalone design experience at /design. */
export function DesignPage() {
  const setShape = useDesigner((s) => s.setShape);

  // Preselect the form when arriving from a collection card (/design?shape=…).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("shape");
    if (q && VALID_SHAPES.has(q)) setShape(q as Shape);
  }, [setShape]);

  return (
    <div className="design-app">
      <header className="design-top">
        <div className="wrap design-top-inner">
          <a className="design-brand" href="/">
            <svg viewBox="0 0 20 24" fill="none" aria-hidden width="16" height="20">
              <path d="M10 1 14 6H6L10 1Z" fill="var(--bronze-2)" />
              <path d="M6.5 8 13.5 8 16 13H4L6.5 8Z" fill="var(--bronze)" />
              <path d="M3.5 15h13L20 22H0L3.5 15Z" fill="#9a8a63" />
            </svg>
            CAIRN
          </a>
          <span className="design-tagline mono">Design your piece</span>
          <a className="design-back" href="/">← Home</a>
        </div>
      </header>

      <Designer />

      <footer className="design-foot">
        <div className="wrap mono">
          CAIRN · made to order · elevation © Copernicus DEM · buildings © Mapbox / OpenStreetMap
        </div>
      </footer>
    </div>
  );
}

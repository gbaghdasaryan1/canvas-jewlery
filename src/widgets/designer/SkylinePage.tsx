import { useEffect, useState } from "react";
import { useDesigner } from "@/app/store";
import { PRESETS } from "@/shared/config/presets";
import type { Shape } from "@/entities/ring/model/types";
import { SkylineDesigner } from "./SkylineDesigner";

const VALID_SHAPES = new Set(["rectangle", "circle"]);
const DEFAULT_CITY = PRESETS.find((p) => p.city)!;

/** The standalone skyline design experience at /skylines. */
export function SkylinePage() {
  const setShape = useDesigner((s) => s.setShape);
  const setLocation = useDesigner((s) => s.setLocation);
  const setAreaKm = useDesigner((s) => s.setAreaKm);
  // Don't mount the designer until the city defaults are in the store —
  // otherwise its queries fire once for the boot location (a mountain) and
  // that throwaway Overpass round-trip races the real one.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // The store boots on a mountain — start skylines on a city instead.
    setLocation(DEFAULT_CITY.lat, DEFAULT_CITY.lng, DEFAULT_CITY.name);
    setAreaKm(DEFAULT_CITY.areaKm ?? 0.3);
    const q = new URLSearchParams(window.location.search).get("shape");
    if (q && VALID_SHAPES.has(q)) setShape(q as Shape);
    setReady(true);
  }, [setShape, setLocation, setAreaKm]);

  return (
    <div className="design-app">
      <header className="design-top">
        <div className="wrap design-top-inner">
          <a className="design-brand" href="/">
            <svg viewBox="0 0 20 24" fill="none" aria-hidden width="16" height="20">
              <path d="M10 1 14 6H6L10 1Z" fill="var(--bronze-2)" />
              <path d="M6.5 8 13.5 8 16 13H4L6.5 8Z" fill="var(--bronze)" />
              <path d="M3.5 15h13L20 22H0L3.5 15Z" fill="#98a2ae" />
            </svg>
            CAIRN
          </a>
          <span className="design-tagline mono">Design your skyline</span>
          <a className="design-back" href="/design">Terrain →</a>
          <a className="design-back" href="/">← Home</a>
        </div>
      </header>

      {ready && <SkylineDesigner />}

      <footer className="design-foot">
        <div className="wrap mono">
          CAIRN · made to order · map data © OpenStreetMap contributors
        </div>
      </footer>
    </div>
  );
}

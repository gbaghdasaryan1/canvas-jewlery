import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDesigner } from "@/app/store";
import { useT } from "@/shared/i18n";
import { LanguageSwitcher } from "@/features/language-switcher/LanguageSwitcher";
import { PRESETS } from "@/shared/config/presets";
import type { Shape } from "@/entities/ring/model/types";
import { SkylineDesigner } from "./SkylineDesigner";
import { BrandMark } from "../site/LandingHeader";

const VALID_SHAPES = new Set(["rectangle", "circle"]);
const DEFAULT_CITY = PRESETS.find((p) => p.city)!;

/** The standalone skyline design experience at /maps. */
export function SkylinePage() {
  const setShape = useDesigner((s) => s.setShape);
  const setLocation = useDesigner((s) => s.setLocation);
  const setAreaKm = useDesigner((s) => s.setAreaKm);
  const t = useT();
  const [searchParams] = useSearchParams();
  // Don't mount the designer until the city defaults are in the store —
  // otherwise its queries fire once for the boot location (a mountain) and
  // that throwaway Overpass round-trip races the real one.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // The store boots on a mountain — start maps on a city instead.
    setLocation(DEFAULT_CITY.lat, DEFAULT_CITY.lng, DEFAULT_CITY.name);
    setAreaKm(DEFAULT_CITY.areaKm ?? 0.3);
    const q = searchParams.get("shape");
    if (q && VALID_SHAPES.has(q)) setShape(q as Shape);
    setReady(true);
  }, [setShape, setLocation, setAreaKm, searchParams]);

  return (
    <div className="design-app">
      <header className="design-top">
        <div className="wrap design-top-inner">
          <Link className="design-brand" to="/">
            <BrandMark />
            Mémoire
          </Link>
          <nav className="design-switch" aria-label="Design mode">
            <Link className="design-switch-btn" to="/mountains">
              {t.designer.modeMountains}
            </Link>
            <Link className="design-switch-btn on" to="/maps" aria-current="page">
              {t.designer.modeMaps}
            </Link>
          </nav>
          <LanguageSwitcher />

        </div>
      </header>

      {ready && <SkylineDesigner />}

      <footer className="design-foot">
        <div className="wrap mono">
          Mémoire · made to order · map data © OpenStreetMap contributors
        </div>
      </footer>
    </div>
  );
}

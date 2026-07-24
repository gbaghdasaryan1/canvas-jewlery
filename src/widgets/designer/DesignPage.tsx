import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDesigner } from "@/app/store";
import { useT } from "@/shared/i18n";
import { LanguageSwitcher } from "@/features/language-switcher/LanguageSwitcher";
import type { JewelryType, Shape } from "@/entities/ring/model/types";
import { Designer } from "./Designer";
import { BrandMark } from "../site/LandingHeader";

const VALID_SHAPES = new Set(["rectangle", "circle"]);
const VALID_TYPES = new Set(["pendant", "ring", "bracelet"]);

/** The standalone design experience at /mountains. */
export function DesignPage() {
  const setShape = useDesigner((s) => s.setShape);
  const setJewelryType = useDesigner((s) => s.setJewelryType);
  const t = useT();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("shape");
    if (q && VALID_SHAPES.has(q)) setShape(q as Shape);
    const ty = searchParams.get("type");
    if (ty && VALID_TYPES.has(ty)) setJewelryType(ty as JewelryType);
  }, [setShape, setJewelryType, searchParams]);

  return (
    <div className="design-app">
      <header className="design-top">
        <div className="wrap design-top-inner">
          <Link className="design-brand" to="/">
            <BrandMark />
            Mémoire
          </Link>
          <nav className="design-switch" aria-label="Design mode">
            <Link className="design-switch-btn on" to="/mountains" aria-current="page">
              {t.designer.modeMountains}
            </Link>
            <Link className="design-switch-btn" to="/maps">
              {t.designer.modeMaps}
            </Link>
          </nav>
          <LanguageSwitcher />

        </div>
      </header>

      <Designer />

      <footer className="design-foot">
        <div className="wrap mono">
          Mémoire · made to order · map data © OpenStreetMap contributors
        </div>
      </footer>
    </div>
  );
}

import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDesigner } from "@/app/store";
import type { Shape } from "@/entities/ring/model/types";
import { Designer } from "./Designer";

const VALID_SHAPES = new Set(["rectangle", "circle"]);

/** The standalone design experience at /mountains. */
export function DesignPage() {
  const setShape = useDesigner((s) => s.setShape);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("shape");
    if (q && VALID_SHAPES.has(q)) setShape(q as Shape);
  }, [setShape, searchParams]);

  return (
    <div className="design-app">
      <header className="design-top">
        <div className="wrap design-top-inner">
          <Link className="design-brand" to="/">
            <svg viewBox="0 0 20 24" fill="none" aria-hidden width="16" height="20">
              <path d="M10 1 14 6H6L10 1Z" fill="var(--bronze-2)" />
              <path d="M6.5 8 13.5 8 16 13H4L6.5 8Z" fill="var(--bronze)" />
              <path d="M3.5 15h13L20 22H0L3.5 15Z" fill="#98a2ae" />
            </svg>
            CAIRN
          </Link>
          <span className="design-tagline mono">Design your piece</span>
          <Link className="design-back" to="/maps">maps →</Link>
          <Link className="design-back" to="/">← Home</Link>
        </div>
      </header>

      <Designer />

      <footer className="design-foot">
        <div className="wrap mono">
          CAIRN · made to order · map data © OpenStreetMap contributors
        </div>
      </footer>
    </div>
  );
}

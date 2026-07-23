import type { mountainsGrid } from "@/entities/mountains/model/types";
import { formatLatLng } from "@/shared/lib/format";

interface ReadoutProps {
  lat: number;
  lng: number;
  areaKm: number;
  mountains: mountainsGrid | null;
}

export function Readout({ lat, lng, areaKm, mountains }: ReadoutProps) {
  const relief = mountains ? Math.round(mountains.max - mountains.min) : null;
  const flat = relief !== null && relief < 25 && mountains?.source === "dem";

  return (
    <div className="readout">
      <div className="row">
        <span>Coordinates</span>
        <span>{formatLatLng(lat, lng)}</span>
      </div>
      <div className="row">
        <span>Relief (min–max)</span>
        <span>
          {mountains
            ? `${Math.round(mountains.min)}–${Math.round(mountains.max)} m (Δ${relief})`
            : "—"}
        </span>
      </div>
      <div className="row">
        <span>Sample area</span>
        <span>
          {areaKm} × {areaKm} km
        </span>
      </div>
      <div className="row" style={{ border: "none", paddingBottom: 0 }}>
        <span>Source</span>
        <span className="src">
          <span className={`dot ${mountains?.source === "dem" ? "" : "demo"}`} />
          {mountains
            ? mountains.source === "dem"
              ? "Live DEM (Copernicus)"
              : "Demo mountains (offline)"
            : "—"}
        </span>
      </div>
      {flat && (
        <div className="flat-warn mono">Nearly flat here — try somewhere with more relief.</div>
      )}
    </div>
  );
}

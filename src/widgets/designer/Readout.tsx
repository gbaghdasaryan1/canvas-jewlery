import type { TerrainGrid } from "@/entities/terrain/model/types";
import { formatLatLng } from "@/shared/lib/format";

interface ReadoutProps {
  lat: number;
  lng: number;
  areaKm: number;
  terrain: TerrainGrid | null;
}

export function Readout({ lat, lng, areaKm, terrain }: ReadoutProps) {
  const relief = terrain ? Math.round(terrain.max - terrain.min) : null;
  const flat = relief !== null && relief < 25 && terrain?.source === "dem";

  return (
    <div className="readout">
      <div className="row">
        <span>Coordinates</span>
        <span>{formatLatLng(lat, lng)}</span>
      </div>
      <div className="row">
        <span>Relief (min–max)</span>
        <span>
          {terrain ? `${Math.round(terrain.min)}–${Math.round(terrain.max)} m (Δ${relief})` : "—"}
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
          <span className={`dot ${terrain?.source === "dem" ? "" : "demo"}`} />
          {terrain ? (terrain.source === "dem" ? "Live DEM (Copernicus)" : "Demo terrain (offline)") : "—"}
        </span>
      </div>
      {flat && <div className="flat-warn mono">Nearly flat here — try somewhere with more relief.</div>}
    </div>
  );
}

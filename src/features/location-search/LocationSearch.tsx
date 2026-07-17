import { useEffect, useState } from "react";
import { useDesigner } from "@/app/store";
import { PRESETS, type Preset } from "@/shared/config/presets";
import { useGoogleMaps } from "@/shared/lib/googleMaps";

interface LocationSearchProps {
  /** Preset chips to offer (defaults to all). */
  presets?: Preset[];
  placeholder?: string;
}

export function LocationSearch({
  presets = PRESETS,
  placeholder = "Search a place — e.g. Matterhorn, Yosemite Valley…",
}: LocationSearchProps) {
  const { lat, lng, setLocation, setAreaKm, setShowBuildings } = useDesigner();
  const { isLoaded } = useGoogleMaps();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Editable text for the manual lat/lng fields, synced when the location
  // changes elsewhere (map click, search, preset).
  const [latText, setLatText] = useState(String(lat));
  const [lngText, setLngText] = useState(String(lng));
  useEffect(() => setLatText(String(lat)), [lat]);
  useEffect(() => setLngText(String(lng)), [lng]);

  const clampLat = (v: number) => Math.max(-90, Math.min(90, v));
  const wrapLng = (v: number) => ((((v + 180) % 360) + 360) % 360) - 180;

  function commitCoord(axis: "lat" | "lng", text: string) {
    const v = parseFloat(text);
    if (Number.isNaN(v)) return;
    if (axis === "lat") setLocation(clampLat(v), lng, "Custom location");
    else setLocation(lat, wrapLng(v), "Custom location");
  }

  async function search() {
    const term = q.trim();
    if (!term) return;
    setBusy(true);
    setMsg(null);
    try {
      // Google Geocoder via the Maps JS SDK — same script the map loads,
      // so no extra key exposure and no CORS concerns.
      if (!isLoaded) {
        setMsg("Map is still loading — try again in a moment.");
        return;
      }
      const geocoder = new google.maps.Geocoder();
      const { results } = await geocoder.geocode({ address: term });

      if (results.length > 0) {
        const result = results[0];
        const loc = result.geometry.location;
        const name = result.formatted_address.split(",")[0];
        setLocation(loc.lat(), loc.lng(), name);
      } else {
        setMsg(`No place found for “${term}”.`);
      }
    } catch {
      setMsg(`No place found for “${term}”.`);
    } finally {
      setBusy(false);
    }
  }

  const isActive = (plat: number, plng: number) =>
    Math.abs(plat - lat) < 1e-4 && Math.abs(plng - lng) < 1e-4;

  return (
    <div>
      <div className="findbar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button className="btn" style={{ padding: "11px 18px" }} onClick={search} disabled={busy}>
          {busy ? "…" : "Find"}
        </button>
      </div>
      {msg && <div className="search-msg mono">{msg}</div>}
      <div className="coordbar mono">
        <label>
          Lat
          <input
            type="number"
            step="0.000000001"
            min={-90}
            max={90}
            value={latText}
            onChange={(e) => setLatText(e.target.value)}
            onBlur={(e) => commitCoord("lat", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commitCoord("lat", (e.target as HTMLInputElement).value)}
          />
        </label>
        <label>
          Lng
          <input
            type="number"
            step="0.000000001"
            min={-180}
            max={180}
            value={lngText}
            onChange={(e) => setLngText(e.target.value)}
            onBlur={(e) => commitCoord("lng", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commitCoord("lng", (e.target as HTMLInputElement).value)}
          />
        </label>
      </div>
      <div className="chips">
        {presets.map((p) => (
          <button
            key={p.name}
            className={`chip ${isActive(p.lat, p.lng) ? "active" : ""}`}
            onClick={() => {
              setLocation(p.lat, p.lng, p.name);
              if (p.areaKm) setAreaKm(p.areaKm);
              if (p.city) setShowBuildings(true);
            }}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

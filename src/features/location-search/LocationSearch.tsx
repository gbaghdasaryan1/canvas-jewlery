import { useEffect, useState } from "react";
import { useDesigner } from "@/app/store";
import { PRESETS } from "@/shared/config/presets";

export function LocationSearch() {
  const { lat, lng, areaKm, setLocation, setAreaKm, setShowBuildings } = useDesigner();
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

  // Nudge the location by a fraction of the sample area (1 = north/east).
  function nudge(dLatSign: number, dLngSign: number) {
    const stepKm = Math.max(0.2, areaKm * 0.25);
    const dLat = (dLatSign * stepKm) / 111;
    const dLng = (dLngSign * stepKm) / (111 * Math.cos((lat * Math.PI) / 180) || 1);
    setLocation(clampLat(lat + dLat), wrapLng(lng + dLng), "Custom location");
  }

  async function search() {
    const term = q.trim();
    if (!term) return;
    setBusy(true);
    setMsg(null);
    try {
      // Nominatim — free, keyless OpenStreetMap geocoder.
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(term)}`,
        { headers: { Accept: "application/json" } }
      );
      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;

      if (data.length > 0) {
        const result = data[0];
        const name = result.display_name.split(",")[0];
        setLocation(parseFloat(result.lat), parseFloat(result.lon), name);
      } else {
        setMsg(`No place found for “${term}”.`);
      }
    } catch {
      setMsg("Search unavailable here — use a place below.");
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
          placeholder="Search a place — e.g. Matterhorn, Yosemite Valley…"
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
      <div className="nudgerow mono">
        <span className="nudge-label">Move</span>
        <div className="nudgepad">
          <button className="nudge n" onClick={() => nudge(0.5, 0)} title="North" aria-label="Move north">↑</button>
          <button className="nudge w" onClick={() => nudge(0, -0.5)} title="West" aria-label="Move west">←</button>
          <button className="nudge e" onClick={() => nudge(0, 0.5)} title="East" aria-label="Move east">→</button>
          <button className="nudge s" onClick={() => nudge(-0.5, 0)} title="South" aria-label="Move south">↓</button>
        </div>
      </div>
      <div className="chips">
        {PRESETS.map((p) => (
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

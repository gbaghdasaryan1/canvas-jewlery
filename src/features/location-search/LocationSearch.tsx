import { useState } from "react";
import { useDesigner } from "@/app/store";
import { useT } from "@/shared/i18n";
import { PRESETS, type Preset } from "@/shared/config/presets";
import { useGoogleMaps } from "@/shared/lib/googleMaps";

interface LocationSearchProps {
  /** Preset chips to offer (defaults to all). */
  presets?: Preset[];
  placeholder?: string;
}

export function LocationSearch({ presets = PRESETS, placeholder }: LocationSearchProps) {
  const { lat, lng, setLocation, setAreaKm, setShowBuildings } = useDesigner();
  const t = useT();
  const { isLoaded } = useGoogleMaps();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function search() {
    const term = q.trim();
    if (!term) return;
    setBusy(true);
    setMsg(null);
    try {
      // Google Geocoder via the Maps JS SDK — same script the map loads,
      // so no extra key exposure and no CORS concerns.
      if (!isLoaded) {
        setMsg(t.designer.searchLoading);
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
        setMsg(t.designer.searchNoResult(term));
      }
    } catch {
      setMsg(t.designer.searchNoResult(term));
    } finally {
      setBusy(false);
    }
  }

  const isActive = (plat: number, plng: number) =>
    Math.abs(plat - lat) < 1e-4 && Math.abs(plng - lng) < 1e-4;

  return (
    <div className="loc">
      <div className="findbar">
        <span className="findbar-ico" aria-hidden>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder={placeholder ?? t.designer.searchMountainsPlaceholder}
          autoComplete="off"
          aria-label={t.designer.find}
        />
        <button className="findbar-go" onClick={search} disabled={busy}>
          {busy ? "…" : t.designer.find}
        </button>
      </div>
      {msg && <div className="search-msg mono">{msg}</div>}

      <div className="chips" role="list">
        {presets.map((p) => (
          <button
            key={p.name}
            role="listitem"
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

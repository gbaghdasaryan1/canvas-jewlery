import { useEffect, useRef, useState } from "react";
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
  const [presetOpen, setPresetOpen] = useState(false);
  const presetRef = useRef<HTMLDivElement>(null);

  // Close the preset menu on outside click / Escape.
  useEffect(() => {
    if (!presetOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!presetRef.current?.contains(e.target as Node)) setPresetOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresetOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [presetOpen]);

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

  const activePreset = presets.find((p) => isActive(p.lat, p.lng));

  function selectPreset(name: string) {
    const p = presets.find((x) => x.name === name);
    if (!p) return;
    setLocation(p.lat, p.lng, p.name);
    if (p.areaKm) setAreaKm(p.areaKm);
    if (p.city) setShowBuildings(true);
  }

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

      <div className={`preset-field ${presetOpen ? "open" : ""}`} ref={presetRef}>
        <button
          type="button"
          className="preset-trigger mono"
          aria-haspopup="listbox"
          aria-expanded={presetOpen}
          onClick={() => setPresetOpen((v) => !v)}
        >
          <span className={`preset-current ${activePreset ? "" : "placeholder"}`}>
            {activePreset?.name ?? t.designer.presetPrompt}
          </span>
          <span className="preset-caret" aria-hidden>
            <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 4.5 3 3 3-3" />
            </svg>
          </span>
        </button>
        {presetOpen && (
          <div className="preset-menu" role="listbox" aria-label={t.designer.presetPrompt}>
            {presets.map((p) => (
              <button
                key={p.name}
                type="button"
                role="option"
                aria-selected={activePreset?.name === p.name}
                className={`preset-option ${activePreset?.name === p.name ? "on" : ""}`}
                onClick={() => {
                  selectPreset(p.name);
                  setPresetOpen(false);
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

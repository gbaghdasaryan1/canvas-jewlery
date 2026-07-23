import { useEffect, useRef, useState } from "react";
import { useDesigner } from "@/app/store";
import { useT } from "@/shared/i18n";
import { PRESETS, type Preset } from "@/shared/config/presets";
import { useGoogleMaps } from "@/shared/lib/googleMaps";
import { useDebouncedValue } from "@/shared/lib/useDebouncedValue";
import styles from "./LocationSearch.module.css";

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

  // Places autocomplete state.
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const acServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  // Debounce keystrokes so we don't fire a prediction request per character.
  const dq = useDebouncedValue(q, 180);

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

  // Fetch place predictions as the user types (Places AutocompleteService).
  useEffect(() => {
    const term = dq.trim();
    if (!isLoaded || term.length < 2 || !google.maps.places) {
      setPredictions([]);
      return;
    }
    const svc =
      acServiceRef.current ?? (acServiceRef.current = new google.maps.places.AutocompleteService());
    if (!sessionRef.current) sessionRef.current = new google.maps.places.AutocompleteSessionToken();
    let cancelled = false;
    svc.getPlacePredictions({ input: term, sessionToken: sessionRef.current }, (preds) => {
      if (!cancelled) setPredictions(preds ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [dq, isLoaded]);

  // Close the suggestions on outside click / Escape.
  useEffect(() => {
    if (!searchOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [searchOpen]);

  // Resolve a picked prediction to coordinates (geocode by placeId — no extra
  // PlacesService/map needed) and drop the pin there.
  async function pickPrediction(pred: google.maps.places.AutocompletePrediction) {
    const label = pred.structured_formatting?.main_text ?? pred.description.split(",")[0];
    setQ(pred.description);
    setPredictions([]);
    setSearchOpen(false);
    setMsg(null);
    try {
      const geocoder = new google.maps.Geocoder();
      const { results } = await geocoder.geocode({ placeId: pred.place_id });
      if (results[0]) {
        const loc = results[0].geometry.location;
        setLocation(loc.lat(), loc.lng(), label);
      }
    } catch {
      setMsg(t.designer.searchNoResult(label));
    } finally {
      // A session token is spent once a place is picked — start a fresh one.
      sessionRef.current = null;
    }
  }

  async function search() {
    const term = q.trim();
    if (!term) return;
    setSearchOpen(false);
    setPredictions([]);
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
    <div className={styles.loc}>
      <div className={styles.findbarWrap} ref={searchRef}>
        <div className={styles.findbar}>
          <span className={styles.findbarIco} aria-hidden>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.2-3.2" />
            </svg>
          </span>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder={placeholder ?? t.designer.searchMountainsPlaceholder}
            autoComplete="off"
            aria-label={t.designer.find}
            aria-expanded={searchOpen && predictions.length > 0}
            role="combobox"
            aria-autocomplete="list"
          />
          <button className={styles.findbarGo} onClick={search} disabled={busy}>
            {busy ? "…" : t.designer.find}
          </button>
        </div>
        {searchOpen && predictions.length > 0 && (
          <div className={styles.acMenu} role="listbox" aria-label={t.designer.find}>
            {predictions.map((p) => (
              <button
                key={p.place_id}
                type="button"
                role="option"
                aria-selected={false}
                className={styles.acOption}
                onClick={() => pickPrediction(p)}
              >
                <span className={styles.acIco} aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 21s-7-6.4-7-11a7 7 0 0 1 14 0c0 4.6-7 11-7 11Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                </span>
                <span className={styles.acText}>
                  <span className={styles.acMain}>
                    {p.structured_formatting?.main_text ?? p.description}
                  </span>
                  {p.structured_formatting?.secondary_text && (
                    <span className={styles.acSub}>{p.structured_formatting.secondary_text}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {msg && <div className="search-msg mono">{msg}</div>}

      <div className={`${styles.presetField} ${presetOpen ? "open" : ""}`} ref={presetRef}>
        <button
          type="button"
          className={`${styles.presetTrigger} mono`}
          aria-haspopup="listbox"
          aria-expanded={presetOpen}
          onClick={() => setPresetOpen((v) => !v)}
        >
          <span className={`${styles.presetCurrent} ${activePreset ? "" : "placeholder"}`}>
            {activePreset?.name ?? t.designer.presetPrompt}
          </span>
          <span className={styles.presetCaret} aria-hidden>
            <svg
              viewBox="0 0 12 12"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 4.5 3 3 3-3" />
            </svg>
          </span>
        </button>
        {presetOpen && (
          <div className={styles.presetMenu} role="listbox" aria-label={t.designer.presetPrompt}>
            {presets.map((p) => (
              <button
                key={p.name}
                type="button"
                role="option"
                aria-selected={activePreset?.name === p.name}
                className={`${styles.presetOption} ${activePreset?.name === p.name ? "on" : ""}`}
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

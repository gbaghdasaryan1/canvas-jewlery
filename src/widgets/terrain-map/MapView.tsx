import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// OpenStreetMap tiles — keyless, no billing, works for anyone who clones the repo.
//
// PRODUCTION: OSM's public tile server is fine for dev but has a fair-use policy
// and is NOT for production load. For launch, swap the url + attribution below to
// a hosted provider with a free tier (Carto, Stadia Maps, MapTiler). The Leaflet
// code stays identical — only the tile URL/attribution change.
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = "&copy; OpenStreetMap contributors";

// A styled dot via L.divIcon, NOT the default marker — this sidesteps Leaflet's
// broken marker-image paths under Vite/bundlers. Styled by `.cairn-pin` in global.css.
const PIN = L.divIcon({
  className: "cairn-pin",
  html: "<span></span>",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export interface MapViewProps {
  lat: number;
  lng: number;
  /** Called when the user clicks the map or drags the marker. */
  onSelect: (lat: number, lng: number) => void;
  /** Optional: report the map center after pan/zoom (debounced ~200ms). */
  onCenterChange?: (lat: number, lng: number) => void;
}

/**
 * Keeps the map centered on external lat/lng changes (search, presets, nudge,
 * manual coordinate edits). MapContainer's `center` is only the initial value,
 * so we drive later moves imperatively via useMap().
 */
function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

/** Click-to-place selection + optional debounced center reporting. */
function MapEvents({ onSelect, onCenterChange }: Pick<MapViewProps, "onSelect" | "onCenterChange">) {
  const timer = useRef<number | undefined>(undefined);
  const map = useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
    moveend() {
      if (!onCenterChange) return;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const c = map.getCenter();
        onCenterChange(c.lat, c.lng);
      }, 200);
    },
  });
  return null;
}

/**
 * Self-contained, keyless Leaflet map. Fills its container — the container
 * (`.map-canvas`) supplies an explicit height, which Leaflet requires or it
 * renders blank.
 */
export function MapView({ lat, lng, onSelect, onCenterChange }: MapViewProps) {
  return (
    <MapContainer center={[lat, lng]} zoom={11} className="map-canvas">
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
      <Marker
        position={[lat, lng]}
        icon={PIN}
        draggable
        eventHandlers={{
          dragend(e) {
            const p = (e.target as L.Marker).getLatLng();
            onSelect(p.lat, p.lng);
          },
        }}
      />
      <Recenter lat={lat} lng={lng} />
      <MapEvents onSelect={onSelect} onCenterChange={onCenterChange} />
    </MapContainer>
  );
}

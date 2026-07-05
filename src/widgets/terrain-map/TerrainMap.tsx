import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useDesigner } from "@/app/store";

// Free OpenStreetMap tiles — no API key required.
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// A divIcon (styled by `.cairn-pin` in global.css) avoids Leaflet's default
// marker-image asset paths, which break under bundlers.
const PIN = L.divIcon({
  className: "cairn-pin",
  html: "<span></span>",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function TerrainMap() {
  const { lat, lng, setLocation } = useDesigner();
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Keep the latest setLocation reachable from the click handler without
  // re-initializing the map.
  const setLocationRef = useRef(setLocation);
  setLocationRef.current = setLocation;

  // Initialize the map once.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;

    const map = L.map(elRef.current, { center: [lat, lng], zoom: 11 });
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);

    const marker = L.marker([lat, lng], { icon: PIN }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      setLocationRef.current(e.latlng.lat, e.latlng.lng, "Custom location");
    });

    // Ensure Leaflet measures the container after layout settles.
    setTimeout(() => map.invalidateSize(), 0);

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect location changes from search, presets, nudge, or coordinate edits.
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], mapRef.current.getZoom());
  }, [lat, lng]);

  return <div className="map-canvas" ref={elRef} />;
}
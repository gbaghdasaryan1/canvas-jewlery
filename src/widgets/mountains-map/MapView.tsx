import { useCallback, useEffect, useRef } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY, useGoogleMaps } from "@/shared/lib/googleMaps";

const containerStyle = { width: "100%", height: "100%" };

export interface MapViewProps {
  lat: number;
  lng: number;
  /** Called when the user clicks the map or drags the marker. */
  onSelect: (lat: number, lng: number) => void;
  /** Optional: report the map center after pan/zoom (debounced ~200ms). */
  onCenterChange?: (lat: number, lng: number) => void;
}

/**
 * Google Maps point picker. Fills its container — `.map-canvas` supplies the
 * explicit height. Requires VITE_GOOGLE_MAPS_API_KEY (Maps JavaScript API).
 *
 * The marker is created imperatively on the map instance (not via the
 * @react-google-maps/api `<Marker>` wrapper, which intermittently fails to
 * mount) so the pin always shows.
 */
export function MapView({ lat, lng, onSelect, onCenterChange }: MapViewProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const idleTimer = useRef<number | undefined>(undefined);
  const { isLoaded, loadError } = useGoogleMaps();

  // Keep the latest coords/callback without re-running the one-time map load.
  const coordsRef = useRef({ lat, lng });
  coordsRef.current = { lat, lng };
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Keep the map centered and the pin positioned on external lat/lng changes
  // (search, presets, nudge, manual coordinate edits) without remounting.
  useEffect(() => {
    mapRef.current?.setCenter({ lat, lng });
    markerRef.current?.setPosition({ lat, lng });
  }, [lat, lng]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    const marker = new google.maps.Marker({
      map,
      position: coordsRef.current,
      draggable: true,
      title: "Selected location",
      // Default Google Maps pin (standard red marker).
    });
    marker.addListener("dragend", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) onSelectRef.current(e.latLng.lat(), e.latLng.lng());
    });
    markerRef.current = marker;
  }, []);

  const onMapUnmount = useCallback(() => {
    markerRef.current?.setMap(null);
    markerRef.current = null;
    mapRef.current = null;
  }, []);

  const handleClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) onSelectRef.current(e.latLng.lat(), e.latLng.lng());
  }, []);

  const handleIdle = useCallback(() => {
    if (!onCenterChange) return;
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      const c = mapRef.current?.getCenter();
      if (c) onCenterChange(c.lat(), c.lng());
    }, 200);
  }, [onCenterChange]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="map-canvas map-fallback mono">
        Set VITE_GOOGLE_MAPS_API_KEY in .env to enable the map.
      </div>
    );
  }
  if (loadError) {
    return <div className="map-canvas map-fallback mono">Google Maps failed to load.</div>;
  }
  if (!isLoaded) {
    return <div className="map-canvas map-fallback mono">Loading map…</div>;
  }

  return (
    <div className="map-canvas">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{ lat, lng }}
        zoom={11}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
        onClick={handleClick}
        onIdle={handleIdle}
        options={{
          mapTypeControl: false,
          // "hybrid" = satellite imagery with place names, roads, and labels
          // overlaid (plain "satellite" shows no titles).
          mapTypeId: "hybrid",
          streetViewControl: false,
          fullscreenControl: true,
          // One finger scrolls the page; two fingers pan the map. Keeps the
          // map from trapping page scroll on touch devices.
          gestureHandling: "cooperative",
          zoomControl: true,
        }}
      />
    </div>
  );
}

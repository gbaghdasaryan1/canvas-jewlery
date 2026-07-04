import { useCallback, useEffect, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { useDesigner } from "@/app/store";

const containerStyle = {
  width: "100%",
  height: "100%",
};

export function TerrainMap() {
  const { lat, lng, setLocation } = useDesigner();
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      map.setCenter({ lat, lng });
    },
    [lat, lng]
  );

  useEffect(() => {
    if (mapRef.current && isLoaded) {
      mapRef.current.setCenter({ lat, lng });
    }
  }, [lat, lng, isLoaded]);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        setLocation(newLat, newLng, "Custom location");
      }
    },
    [setLocation]
  );

  if (!isLoaded) {
    return <div className="map-canvas">Loading Google Maps...</div>;
  }

  return (
    <div className="map-canvas">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{ lat, lng }}
        zoom={11}
        onLoad={onMapLoad}
        onClick={handleMapClick}
        options={{
          mapTypeControl: true,
          streetViewControl: true, // pegman → drag onto the map for 360° Street View
          fullscreenControl: true,
          // One finger scrolls the page; two fingers pan the map. Keeps the map
          // from trapping page scroll on touch devices.
          gestureHandling: "cooperative",
          zoomControl: true,
        }}
      >
        <Marker position={{ lat, lng }} title="Selected location" />
      </GoogleMap>
    </div>
  );
}

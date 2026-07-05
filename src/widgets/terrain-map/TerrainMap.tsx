import { useDesigner } from "@/app/store";
import { MapView } from "./MapView";

/** Binds the Google Maps <MapView> to the designer store. */
export function TerrainMap() {
  const { lat, lng, setLocation } = useDesigner();
  return (
    <MapView lat={lat} lng={lng} onSelect={(la, lo) => setLocation(la, lo, "Custom location")} />
  );
}

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/shared/lib/mapbox";
import { buildCityStyle, INTERACTIVE_LAYERS } from "./cityMapStyle";

/** Minimal feature shape — mapbox-gl v3's GeoJSONFeature type hides these. */
interface PickedFeature {
  id?: number | string;
  properties?: Record<string, unknown> | null;
}

export interface CityMapProps {
  lat: number;
  lng: number;
  /** Called when the user clicks the map or drags the marker. */
  onSelect: (lat: number, lng: number) => void;
}

/** Popup body built via DOM (not innerHTML) so feature values are inert text. */
function popupContent(props: Record<string, unknown>): HTMLElement {
  const root = document.createElement("div");
  root.className = "citymap-popup mono";
  const title = document.createElement("strong");
  title.textContent = String(props.name_en ?? props.name ?? "Unnamed");
  root.appendChild(title);
  for (const key of ["class", "maki"] as const) {
    if (props[key] == null) continue;
    const row = document.createElement("div");
    row.textContent = `${key}: ${String(props[key])}`;
    root.appendChild(row);
  }
  return root;
}

/**
 * Mapbox GL city picker for /skylines — custom-styled Streets v8 tiles with
 * 3D building extrusions, tilted for a skyline view. Click or drag the pin to
 * choose the spot; roads/POIs/places are hoverable and show details on click.
 */
export function CityMap({ lat, lng, onSelect }: CityMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  // Keep the latest callback without re-initializing the map.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!MAPBOX_TOKEN || !hostRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const lang = (navigator.language || "en").split("-")[0];
    const map = new mapboxgl.Map({
      container: hostRef.current,
      style: buildCityStyle(lang),
      center: [lng, lat],
      zoom: 14.4,
      pitch: 52,
      bearing: -16,
      antialias: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

    const marker = new mapboxgl.Marker({ draggable: true, color: "#74808d" })
      .setLngLat([lng, lat])
      .addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLngLat();
      onSelectRef.current(p.lat, p.lng);
    });

    const popup = new mapboxgl.Popup({ closeButton: false, maxWidth: "240px", offset: 10 });

    map.on("click", (e) => {
      // A click always picks the location; if it also lands on an interactive
      // feature, surface that feature's details.
      onSelectRef.current(e.lngLat.lat, e.lngLat.lng);
      const feature = map.queryRenderedFeatures(e.point, { layers: INTERACTIVE_LAYERS })[0] as
        | PickedFeature
        | undefined;
      if (feature) popup.setLngLat(e.lngLat).setDOMContent(popupContent(feature.properties ?? {})).addTo(map);
      else popup.remove();
    });

    // Hover: pointer cursor everywhere interactive; roads highlight through
    // feature-state keyed by the feature's tile ID.
    let hoveredRoad: number | string | undefined;
    const clearRoadHover = () => {
      if (hoveredRoad !== undefined) {
        map.setFeatureState(
          { source: "streets", sourceLayer: "road", id: hoveredRoad },
          { hover: false },
        );
        hoveredRoad = undefined;
      }
    };
    for (const layer of INTERACTIVE_LAYERS) {
      map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
    }
    map.on("mousemove", "road-line", (e) => {
      const f = e.features?.[0] as PickedFeature | undefined;
      if (!f || f.id === undefined || f.id === hoveredRoad) return;
      clearRoadHover();
      hoveredRoad = f.id;
      map.setFeatureState({ source: "streets", sourceLayer: "road", id: hoveredRoad }, { hover: true });
    });
    map.on("mouseleave", "road-line", clearRoadHover);

    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Init once; lat/lng only seed the first camera — moves are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow external location changes (search, presets, nudges, coord edits).
  useEffect(() => {
    markerRef.current?.setLngLat([lng, lat]);
    mapRef.current?.easeTo({ center: [lng, lat], duration: 800 });
  }, [lat, lng]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="citymap map-fallback mono">
        Set VITE_MAPBOX_TOKEN in .env to enable the city map.
      </div>
    );
  }
  return <div ref={hostRef} className="citymap" />;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Maps JS API key (Maps JavaScript + Geocoding + Elevation). */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

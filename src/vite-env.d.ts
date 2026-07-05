/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Mapbox token — used only for the optional 3D Skyline (buildings/streets). */
  readonly VITE_MAPBOX_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

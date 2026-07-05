/// <reference types="vite/client" />

// No environment variables are required — the app runs fully on keyless
// OpenStreetMap APIs (tiles, Nominatim, Overpass).
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ImportMetaEnv {}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

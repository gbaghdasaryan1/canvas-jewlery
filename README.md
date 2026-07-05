# CAIRN — bespoke topographic rings

Pick any point on Earth, read its real terrain, and generate a wearable ring from it.
Working prototype of the full pipeline: **map → live elevation → watertight ring mesh →
metal render → printable STL**.

> The brand name is a placeholder — rename freely.

## Stack

- **Vite + React 18 + TypeScript**
- **@react-three/fiber + drei** — the 3D ring viewer
- **@react-google-maps/api** — Google Maps point picking, geocoding, elevation
- **Zustand** — design parameters
- **@tanstack/react-query** — cached elevation fetching
- **Feature-Sliced Design** layout

## Run

```bash
npm install
cp .env.example .env   # then set VITE_GOOGLE_MAPS_API_KEY
npm run dev      # http://localhost:5174
npm run build    # type-check + production build
```

## How it works

1. `entities/terrain/api/fetchElevation` samples a GRID×GRID patch around the chosen
   coordinate from the **Google Elevation service**. On any failure (no API key,
   offline) it falls back to deterministic, location-seeded procedural terrain, so the
   app always renders something — the source badge tells you which you're seeing.
2. `shared/lib/ringGeometry` normalizes the heightfield and wraps it into a **watertight
   band** (inner + outer surfaces + rims), easing the wrap seam so the ends meet cleanly.
3. `widgets/ring-viewer` builds a `BufferGeometry` and renders it as metal.
4. `shared/lib/stl` serializes the same mesh to a **binary STL** for casting or 3D print.

## Architecture (FSD)

```
src/
  app/         store (zustand), providers (react-query), App
  shared/      tokens + styles, config (presets, GRID), lib (ringGeometry, stl, format), ui
  entities/    terrain (model, procedural, fetch, useElevation), ring (metals, params)
  features/    location-search, ring-controls, stl-export
  widgets/     designer, terrain-map, ring-viewer, relief-preview, site sections
```

## Known limitations / next steps

- **Wearability guard** — auto-reject or auto-reframe places below a relief threshold
  (the flat-terrain problem is real; the readout warns but doesn't yet act).
- The "Re-read terrain" and pricing flows are stubs; wire to a real quote/checkout.
- STL export produces a manifold band, but production casting needs a sizing pass,
  minimum-feature-width checks, and an inner comfort-fit profile.
- Map, search, and elevation require `VITE_GOOGLE_MAPS_API_KEY` (Maps JavaScript,
  Geocoding, and Elevation APIs enabled, billing on). Streets/buildings overlays
  use the keyless OSM Overpass API and are rate-limited.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server at http://localhost:5174 (port set in vite.config.ts)
npm run build      # tsc --noEmit + vite production build
npm run typecheck  # type-check only, no emit
npm run preview    # preview the production build locally
```

There is no linter or test runner configured.

## Architecture

This is a **Feature-Sliced Design (FSD)** React app (Vite + React 18 + TS). The `@` alias resolves to `src/`. Lower layers must not import from higher ones: `shared` → `entities` → `features` → `widgets` → `app`.

```
src/
  app/       App (path-based routing: "/" → Landing, "/design" → DesignPage,
             "/skylines" → SkylinePage, "/pendant" → PendantPage),
             useDesigner Zustand store, React Query provider
  shared/    config (PRESETS, GRID), lib (ringGeometry, heightField, smooth,
             pricing, stl, overpass, format), design tokens, Panel UI
  entities/  terrain (procedural elevation), buildings & streets (Overpass/OSM),
             ring (metals, Shape, design-input → geometry params)
  features/  location-search (Google Geocoder), ring-controls, stl-export
  widgets/   designer, terrain-map (Google Maps), ring-viewer (r3f),
             relief-preview (2D canvas), site/ (landing sections)
```

**Product**: the user picks a place on a map and gets a cast-metal **relief piece** in one of three shapes (`Shape` in `entities/ring/model/types.ts`): `rectangle` ("plaque"), `heart`, `circle` ("disc"). The `ring` naming in entities/lib is historical — a wrap-around ring-band builder (`buildRingMesh`) still exists in `ringGeometry.ts` but the app renders slab/fan plaques via `buildShapeMesh`.

**Data flow: location → heightfield → mesh → render / STL / price**

1. `widgets/terrain-map/MapView` (Google Maps via @react-google-maps/api) or `features/location-search` (Google Geocoder) writes `lat/lng/name` into `useDesigner` (`app/store.ts`), which holds all design inputs (shape, areaKm, width, relief, thickness, smooth, overlays, metal). The SDK is loaded once through `shared/lib/googleMaps.useGoogleMaps()` — every consumer goes through that hook (or `whenGoogleReady()` outside React). Requires `VITE_GOOGLE_MAPS_API_KEY` (see `.env.example`); without it the map renders a notice.
2. `entities/terrain/api/useElevation` → `fetchElevation` samples real elevations from the **Google Elevation service** (Maps JS SDK, 256-location chunks). If the SDK never loads (no key, offline) or a request fails, it falls back to deterministic pseudo-terrain seeded by the coordinate (`lib/procedural.ts`); the `TerrainSource` badge distinguishes `"dem"` vs `"demo"`.
3. Optional city overlays come from the **Overpass API** (`shared/lib/overpass.ts` — tries 4 public mirrors in turn with a 30 s timeout each). `entities/buildings` fetches footprints and `rasterizeBuildings` stamps their heights into a GRID-aligned raster; `entities/streets` fetches road polylines (`rasterizeStreets` stamps them into a GRID mask for skylines; on /design they are drawn only on the 2D `relief-preview` canvas).
   - **/skylines** (`widgets/designer/SkylinePage` + `SkylineDesigner`) skips terrain entirely: buildings + streets from Overpass → `composeCityField` (ground 0, street ridges, gamma-eased building heights) → same shapes/viewer/STL/order. Elevation is never fetched there. The location picker is **Mapbox GL JS** (`widgets/city-map/CityMap` + `cityMapStyle.ts` — a custom silver-themed style over the `mapbox://mapbox.mapbox-streets-v8` vector tileset with 3D `fill-extrusion` buildings; needs `VITE_MAPBOX_TOKEN`). Mapbox tiles are display-only — the castable mesh always comes from OSM/Overpass.
4. `shared/lib/heightField.composeHeightField` = terrain + building raster → normalize to 0..1 → `smoothGrid` (separable 1-2-1 blur, `smooth` iterations). This one function feeds the 3D viewer, the STL export, and pricing, so they always agree.
5. `entities/ring/model/types.toShapeParams` maps design inputs to `SlabParams` (mm); `buildShapeMesh` dispatches to `buildSlabMesh` / `buildHeartMesh` / `buildCircleMesh` in `shared/lib/ringGeometry.ts` — all produce **watertight indexed meshes** (`RingMeshData`).
6. `widgets/ring-viewer` renders it with @react-three/fiber and PBR metals from `METALS`; `shared/lib/stl.ts` serializes the same mesh to **binary STL**; `shared/lib/pricing.ts` computes exact mesh volume (divergence theorem) → grams of silver → price in AMD with per-metal factors.

**/pendant — image → pendant designer** (independent of the map/terrain flow)

- `widgets/pendant-designer` (styled-components UI, react-konva canvas) + `usePendant` store (`model/store.ts`, own undo/redo history of `{config, object}` snapshots — `beginEdit()` once per drag gesture, then updates with `record=false`).
- Pipeline (`features/image-segmentation`, all client-side, every stage lazy-loaded with a fallback): `@imgly/background-removal` (ONNX wasm; falls back to border chroma-key) → OpenCV.js contours (`@techstark/opencv-js`, v5 default export is a **thenable**; falls back to mask bbox) → Potrace wasm SVG (falls back to polygon path). UI consumes only the `ImageSegmentationService` interface from `createSegmentationService()` — swap providers there.
- Geometry (`entities/pendant`): mm y-down space, origin = pendant centre. `resolveHole` clamps the chain hole inside the shape and walks it up until it clears the object; freeform outline = main contour offset by border (`shared/lib/geo2d.offsetPolygon`) unioned with a tab circle around the hole. `pendant3d.buildPendantGeometry` (THREE extrude) exists for a future 3D/STL step but is not mounted.
- Exports (`features/pendant-export`): SVG in real mm, PNG via Konva stage (blob URL — big data: URLs are blocked for anchor downloads), DXF **placeholder**, JSON project.

**Key constants**

- `GRID = 55` (`shared/config/presets.ts`) — heightfield samples per axis; every grid-shaped `Float32Array` in the app is GRID×GRID row-major (row = lat, col = lng, row 0 = south).
- `PRESETS` — famous locations with a tuned `areaKm` window; `city: true` presets auto-enable the buildings overlay.
- Pricing knobs (`shared/lib/pricing.ts`): `SILVER_DENSITY`, `AMD_PER_GRAM_SILVER = 4000`, `METAL_PRICE_FACTOR` (silver 1×, gold 3.2×, platinum 4×).

## Known stubs / caveats

- Ordering is a `mailto:` link composed in `Designer.tsx` — no real checkout.
- Map, search, and elevation all need `VITE_GOOGLE_MAPS_API_KEY` with billing enabled; without it everything degrades (map notice, procedural terrain).
- Public Overpass mirrors (buildings/streets) are keyless and rate-limited — fine for dev, flaky under load.
- STL is manifold but has no minimum-feature-width check for casting.

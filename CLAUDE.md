# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server at http://localhost:5173
npm run build      # tsc --noEmit + vite production build
npm run typecheck  # type-check only, no emit
npm run preview    # preview the production build locally
```

There is no linter or test runner configured.

## Architecture

This is a **Feature-Sliced Design (FSD)** React app. The `@` alias resolves to `src/`.

```
src/
  app/       Zustand store (useDesigner), React Query provider, root App
  shared/    Design tokens, lib (ringGeometry, stl, format), config (GRID, PRESETS), reusable UI
  entities/  terrain (fetch, procedural fallback, hook, types), ring (metals, params, size math)
  features/  location-search, ring-controls, stl-export
  widgets/   designer, terrain-map, ring-viewer, relief-preview, site sections (hero, how-it-works…)
```

**Data flow: location → elevation → mesh → render/export**

1. The user picks a point on a Leaflet map (`widgets/terrain-map`). Coordinates go into `useDesigner` (Zustand store in `app/store.ts`).
2. `entities/terrain/api/useElevation` calls `fetchElevation`, which samples a `GRID×GRID` (28×28) patch from the Open-Meteo Copernicus DEM API. Requests are chunked at 100 coordinates (API limit). On any failure the function falls back to `proceduralTerrain` (deterministic, seeded by lat/lng) — the UI shows a source badge ("DEM" vs "Procedural").
3. `shared/lib/ringGeometry.buildRingMesh` normalizes the heightfield, applies a cosine-eased seam blend (`seamBlend` fraction), and builds a **watertight indexed mesh** (inner surface + outer surface + two rims). The y-axis is the finger axis so the ring stands upright by default.
4. `widgets/ring-viewer` feeds the `BufferGeometry` to `@react-three/fiber` with PBR metal materials defined in `entities/ring/model/types.METALS`.
5. `shared/lib/stl.ts` serializes the same mesh as a **binary STL** for 3D printing or casting.

**Key constants** (in `shared/config/presets.ts`):
- `GRID = 28` — elevation samples per axis (28×28 = 784 points, 8 chunks of 100 to the API)
- `PRESETS` — famous high-relief locations used as starting points

**Ring geometry parameters** (`entities/ring/model/types.toRingParams`):
- `thickness = 1.5 mm`, `amp = 1.7 × relief`, `circSteps = 240`, `widthSteps = 26`, `seamBlend = 0.09`
- US ring size → inner radius: `(11.63 + 0.8128 × size) / 2` mm

## Known stubs

- "Re-read terrain" button and pricing/checkout flow are not wired up.
- Wearability guard (auto-reject flat terrain) is warned in the Readout but not enforced.
- STL is geometrically manifold but lacks sizing pass, minimum-feature-width check, and comfort-fit inner profile for production casting.
- Nominatim geocoder and OSM tiles are rate-limited — a keyed provider is needed for production.

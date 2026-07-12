---
name: verify
description: How to run and visually verify this app (Vite + MCP Docker browser)
---

# Verifying canvas-jewlery changes

## Launch

```bash
npm run dev -- --host 0.0.0.0   # port 5174 (vite.config.ts)
```

The MCP Playwright browser runs in Docker — it cannot reach `localhost`.
Use `http://host.docker.internal:5174/...` AND temporarily add
`allowedHosts: ["host.docker.internal"]` to `server` in `vite.config.ts`
(revert it after; Vite auto-restarts on config change).

## Flows worth driving

- `/skylines` — waits on "Reading the city…" (Overpass fetch, ~20 s for
  Yerevan default). The 3D city viewer is the first `<canvas>`; zoom out
  with mouse-wheel events on its center to see the whole plate. Shape
  buttons (Rectangle/Heart/Circle) re-clip live. "Download STL" fires a
  real download (exercises `buildCityMesh`).
- `/design` — Google Maps key is absent/broken in dev: the map shows an
  error, but terrain falls back to procedural and the metal plaque still
  renders ("Reading terrain…" → viewer). Shape buttons work the same.

## Gotchas

- Console always has a favicon 404; /design has Google Maps errors
  without a billing-enabled key. Both pre-existing noise.
- Overpass mirrors are rate-limited: repeated reloads can stall the
  city fetch.

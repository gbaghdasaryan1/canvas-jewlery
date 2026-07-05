import { GRID } from "@/shared/config/presets";
import type { TerrainGrid } from "../model/types";
import { proceduralTerrain } from "../lib/procedural";

// Open-Meteo's elevation API is free, keyless, CORS-enabled, and backed by the
// Copernicus DEM. It accepts up to 100 coordinates per request.
const ELEVATION_URL = "https://api.open-meteo.com/v1/elevation";
const CHUNK = 100;

export async function fetchElevation(
  lat: number,
  lng: number,
  areaKm: number,
): Promise<TerrainGrid> {
  const dLat = areaKm / 111;
  const dLng = areaKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);

  const lats: number[] = [];
  const lngs: number[] = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      lats.push(lat - dLat / 2 + (dLat * r) / (GRID - 1));
      lngs.push(lng - dLng / 2 + (dLng * c) / (GRID - 1));
    }
  }

  const out = new Float32Array(GRID * GRID);

  try {
    for (let i = 0; i < lats.length; i += CHUNK) {
      const la = lats.slice(i, i + CHUNK).join(",");
      const lo = lngs.slice(i, i + CHUNK).join(",");
      const res = await fetch(`${ELEVATION_URL}?latitude=${la}&longitude=${lo}`);
      if (!res.ok) throw new Error(`Elevation request failed: ${res.status}`);
      const json = (await res.json()) as { elevation: number[] };
      for (let k = 0; k < json.elevation.length; k++) {
        out[i + k] = json.elevation[k];
      }
    }

    let mn = Infinity;
    let mx = -Infinity;
    for (const e of out) {
      if (e < mn) mn = e;
      if (e > mx) mx = e;
    }
    return { data: out, min: mn, max: mx, source: "dem" };
  } catch {
    return proceduralTerrain(lat, lng);
  }
}

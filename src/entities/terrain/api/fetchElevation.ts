import { GRID } from "@/shared/config/presets";
import { whenGoogleReady } from "@/shared/lib/googleReady";
import type { TerrainGrid } from "../model/types";
import { proceduralTerrain } from "../lib/procedural";

const CHUNK = 256; // Google Elevation API accepts up to 512 locations per request

export async function fetchElevation(
  lat: number,
  lng: number,
  areaKm: number,
): Promise<TerrainGrid> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  // The Maps JS SDK is injected lazily by the map widget. Wait for it before
  // sampling real elevation; only fall back to procedural if it never arrives.
  if (!apiKey || !(await whenGoogleReady())) {
    return proceduralTerrain(lat, lng);
  }

  const dLat = areaKm / 111;
  const dLng = areaKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);

  const locations: Array<{ lat: number; lng: number }> = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      locations.push({
        lat: lat - dLat / 2 + (dLat * r) / (GRID - 1),
        lng: lng - dLng / 2 + (dLng * c) / (GRID - 1),
      });
    }
  }

  const out = new Float32Array(GRID * GRID);
  
  // Initialize the native browser service (CORS-free)
  const elevator = new google.maps.ElevationService();

  try {
    for (let i = 0; i < locations.length; i += CHUNK) {
      const chunk = locations.slice(i, i + CHUNK);
      
      // Wrap Google's callback pattern into a modern async Promise
      const response = await new Promise<google.maps.ElevationResult[]>((resolve, reject) => {
        elevator.getElevationForLocations({ locations: chunk }, (results, status) => {
          if (status === google.maps.ElevationStatus.OK && results) {
            resolve(results);
          } else {
            reject(new Error(`Elevation service failed with status: ${status}`));
          }
        });
      });

      for (let k = 0; k < response.length; k++) {
        out[i + k] = response[k].elevation;
      }
    }

    let mn = Infinity, mx = -Infinity;
    for (const e of out) {
      if (e < mn) mn = e;
      if (e > mx) mx = e;
    }
    return { data: out, min: mn, max: mx, source: "dem" };
  } catch {
    return proceduralTerrain(lat, lng);
  }
}

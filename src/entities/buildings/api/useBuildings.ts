import { useQuery } from "@tanstack/react-query";
import { fetchBuildings, type BuildingPolygon } from "./fetchBuildings";

/** Cached building-footprint query keyed on location + area, gated by `enabled`. */
export function useBuildings(lat: number, lng: number, areaKm: number, enabled: boolean) {
  return useQuery<BuildingPolygon[]>({
    queryKey: ["buildings", lat.toFixed(4), lng.toFixed(4), areaKm],
    queryFn: () => fetchBuildings(lat, lng, areaKm),
    enabled,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

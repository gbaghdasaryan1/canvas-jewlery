import { useQuery } from "@tanstack/react-query";
import type { mountainsGrid } from "../model/types";
import { fetchElevation } from "./fetchElevation";

/** Cached elevation query keyed on location + sample area. */
export function useElevation(lat: number, lng: number, areaKm: number) {
  return useQuery<mountainsGrid>({
    queryKey: ["elevation", lat.toFixed(4), lng.toFixed(4), areaKm],
    queryFn: () => fetchElevation(lat, lng, areaKm),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}

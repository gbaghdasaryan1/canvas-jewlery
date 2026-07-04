import { useQuery } from "@tanstack/react-query";
import { fetchStreets, type StreetLine } from "./fetchStreets";

/** Cached street-network query keyed on location + area, gated by `enabled`. */
export function useStreets(lat: number, lng: number, areaKm: number, enabled: boolean) {
  return useQuery<StreetLine[]>({
    queryKey: ["streets", lat.toFixed(4), lng.toFixed(4), areaKm],
    queryFn: () => fetchStreets(lat, lng, areaKm),
    enabled,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

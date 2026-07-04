import { useQuery } from "@tanstack/react-query";
import { fetchCity, type CityData } from "./fetchCity";

/** Cached mini-skyline data (buildings + water + green), gated by `enabled`. */
export function useCity(lat: number, lng: number, areaKm: number, enabled: boolean) {
  return useQuery<CityData>({
    queryKey: ["city", lat.toFixed(4), lng.toFixed(4), areaKm],
    queryFn: () => fetchCity(lat, lng, areaKm),
    enabled,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

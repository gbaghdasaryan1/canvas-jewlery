import type { JewelryType, Metal } from "@/entities/ring/model/types";
import type { RingMeshData } from "./ringGeometry";

/**
 * Flat retail price in AMD per jewelry type. Every piece of a given type costs
 * the same regardless of place, shape, or metal — this is what the customer
 * actually pays, shown in the buy panel and sent with the order.
 */
export const JEWELRY_PRICE_AMD: Record<JewelryType, number> = {
  pendant: 25900,
  ring: 32900,
  bracelet: 27900,
};

/** Density of sterling silver, g/cm³. All mass is computed in silver. */
export const SILVER_DENSITY = 10.49;
/** Quoted silver price. */
export const AMD_PER_GRAM_SILVER = 4000;

/**
 * Per-gram material cost relative to silver. The base calculation is always in
 * grams of silver; gold and platinum scale up from there.
 */
export const METAL_PRICE_FACTOR: Record<Metal, number> = {
  silver: 1,
  gold: 3.2,
  platinum: 4.0,
};

/**
 * Signed volume of a closed, watertight triangle mesh in mm³ (divergence
 * theorem: sum of the signed volumes of tetrahedra from the origin to each
 * face). The mesh from buildRingMesh / buildSlabMesh is manifold, so this is
 * exact — the same solid that gets exported to STL and cast.
 */
export function meshVolumeMm3({ positions, indices }: RingMeshData): number {
  let v6 = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const i = indices[t] * 3, j = indices[t + 1] * 3, k = indices[t + 2] * 3;
    const ax = positions[i], ay = positions[i + 1], az = positions[i + 2];
    const bx = positions[j], by = positions[j + 1], bz = positions[j + 2];
    const cx = positions[k], cy = positions[k + 1], cz = positions[k + 2];
    v6 += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return Math.abs(v6) / 6;
}

export interface PriceEstimate {
  /** mass in grams of silver (by volume) */
  grams: number;
  /** retail price in AMD for the selected metal */
  amd: number;
}

/** Price directly from a solid volume in mm³: volume → grams of silver → AMD. */
export function priceFromVolume(volumeMm3: number, metal: Metal): PriceEstimate {
  const grams = (volumeMm3 / 1000) * SILVER_DENSITY;
  const amd = grams * AMD_PER_GRAM_SILVER * METAL_PRICE_FACTOR[metal];
  return { grams, amd };
}

/** Estimate price from the printed solid: volume → grams of silver → AMD. */
export function estimatePrice(mesh: RingMeshData, metal: Metal): PriceEstimate {
  return priceFromVolume(meshVolumeMm3(mesh), metal);
}

/** Format an AMD amount with thousands separators, e.g. "48,200 ֏". */
export function formatAMD(amd: number): string {
  return `${Math.round(amd).toLocaleString("en-US")} ֏`;
}

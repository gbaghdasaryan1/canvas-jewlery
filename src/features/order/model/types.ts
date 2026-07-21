import type { JewelryType, Metal, Shape } from "@/entities/ring/model/types";

/** The design snapshot sent alongside the STL — everything the user chose. */
export interface OrderOptions {
  /** Which studio produced this piece. */
  product: "mountains" | "skyline" | "pendant";
  place: { name: string; lat: number; lng: number };
  jewelryType: JewelryType;
  shape: Shape;
  metal: Metal;
  /** mm dimensions and relief tuning. */
  width: number;
  relief: number;
  thickness: number;
  areaKm: number;
  smooth: number;
  /** Hang/orientation controls (pendant/bracelet/ring). */
  hangPlace: number; // hang angle in degrees (0 = top)
  hangSize: number;
  hangRotation: number;
  hangHorizontal: boolean;
  ringRotation: number;
  /** Laser-engraving text for the back/inside — blank if none. */
  engraving: string;
  overlays: { buildings: boolean; streets: boolean };
  /** Live price estimate at order time. */
  estimate: { amd: number; grams: number } | null;
}

/** Everything needed to submit an order — built lazily when the user confirms. */
export interface OrderPayload {
  stl: Blob;
  fileName: string;
  options: OrderOptions;
}

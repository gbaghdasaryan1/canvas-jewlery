import { create } from "zustand";
import { isRing } from "@/entities/ring/model/types";
import type { HangPlace, JewelryType, Metal, Shape } from "@/entities/ring/model/types";

// Base plate thickness (mm). Rings sit on a shank band, so they take a thinner
// base than the pendant/bracelet plaques.
const RING_THICKNESS = 0.3;
const DEFAULT_THICKNESS = 0.5;

interface DesignerState {
  // location
  lat: number;
  lng: number;
  name: string;
  // design inputs
  jewelryType: JewelryType;
  hangPlace: HangPlace; // pendant only — where the bail attaches
  hangSize: number; // pendant only — bail loop scale multiplier
  hangRotation: number; // pendant only — bail loop yaw offset, degrees
  hangHorizontal: boolean; // pendant only — rotate bail 90° for chain attachment
  ringRotation: number; // ring only — yaw of the relief plaque on the band, degrees
  shape: Shape;
  areaKm: number;
  width: number;
  relief: number;
  thickness: number; // base thickness in mm
  smooth: number; // relief smoothing passes (0 = sharp)
  showStreets: boolean; // overlay the OSM street network on the relief
  showBuildings: boolean; // overlay OSM building footprints on the relief
  engraving: string; // laser-engraving text: back of pendant/bracelet, inside a ring
  metal: Metal;
  // actions
  setLocation: (lat: number, lng: number, name: string) => void;
  setJewelryType: (t: JewelryType) => void;
  setHangPlace: (h: HangPlace) => void;
  setHangSize: (v: number) => void;
  setHangRotation: (v: number) => void;
  setHangHorizontal: (v: boolean) => void;
  setRingRotation: (v: number) => void;
  setShape: (s: Shape) => void;
  setAreaKm: (v: number) => void;
  setWidth: (v: number) => void;
  setRelief: (v: number) => void;
  setThickness: (v: number) => void;
  setSmooth: (v: number) => void;
  setShowStreets: (v: boolean) => void;
  setShowBuildings: (v: boolean) => void;
  setEngraving: (v: string) => void;
  setMetal: (m: Metal) => void;
}

/** Max engraving length — a laser mark on the back/inside stays short. */
export const ENGRAVING_MAX = 40;

export const useDesigner = create<DesignerState>((set) => ({
  // Default landmark — the first mountains preset (Mt Ararat). Keep lat/lng
  // *and* areaKm in sync with that preset so the default canvas frames Ararat
  // correctly on first load (selecting a preset later sets areaKm itself).
  lat: 39.6841381927097,
  lng: 44.33252033660726,
  name: "Mt Ararat",
  jewelryType: "pendant",
  hangPlace: 0, // hang angle in degrees (0 = top); see HangPlace
  hangSize: 1,
  hangRotation: 0,
  hangHorizontal: true,
  ringRotation: 0,
  shape: "rectangle",
  areaKm: 33.9, // Mt Ararat preset window (see PRESETS)
  width: 18, // mm — plaque side
  relief: 4.6, // mm — max relief height
  thickness: DEFAULT_THICKNESS, // mm — base thickness (ring uses RING_THICKNESS)
  smooth: 0,
  showStreets: false,
  showBuildings: false,
  engraving: "",
  metal: "silver",
  setLocation: (lat, lng, name) => set({ lat, lng, name }),
  setJewelryType: (jewelryType) =>
    set({ jewelryType, thickness: isRing(jewelryType) ? RING_THICKNESS : DEFAULT_THICKNESS }),
  setHangPlace: (hangPlace) => set({ hangPlace }),
  setHangSize: (hangSize) => set({ hangSize }),
  setHangRotation: (hangRotation) => set({ hangRotation }),
  setHangHorizontal: (hangHorizontal) => set({ hangHorizontal }),
  setRingRotation: (ringRotation) => set({ ringRotation }),
  setShape: (shape) => set({ shape }),
  setAreaKm: (areaKm) => set({ areaKm }),
  setWidth: (width) => set({ width }),
  setRelief: (relief) => set({ relief }),
  setThickness: (thickness) => set({ thickness }),
  setSmooth: (smooth) => set({ smooth }),
  setShowStreets: (showStreets) => set({ showStreets }),
  setShowBuildings: (showBuildings) => set({ showBuildings }),
  setEngraving: (engraving) => set({ engraving: engraving.slice(0, ENGRAVING_MAX) }),
  setMetal: (metal) => set({ metal }),
}));

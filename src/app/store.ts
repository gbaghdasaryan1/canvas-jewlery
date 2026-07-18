import { create } from "zustand";
import type { HangPlace, JewelryType, Metal, Shape } from "@/entities/ring/model/types";

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
  setMetal: (m: Metal) => void;
}

export const useDesigner = create<DesignerState>((set) => ({
  lat: 27.9881,
  lng: 86.925,
  name: "Mount Everest",
  jewelryType: "pendant",
  hangPlace: "top",
  hangSize: 1,
  hangRotation: 0,
  hangHorizontal: true,
  ringRotation: 0,
  shape: "rectangle",
  areaKm: 40,
  width: 18, // mm — plaque side
  relief: 4.6, // mm — max relief height
  thickness: 0.5, // mm — base thickness
  smooth: 0,
  showStreets: false,
  showBuildings: false,
  metal: "silver",
  setLocation: (lat, lng, name) => set({ lat, lng, name }),
  setJewelryType: (jewelryType) => set({ jewelryType }),
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
  setMetal: (metal) => set({ metal }),
}));

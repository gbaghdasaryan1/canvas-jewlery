import { create } from "zustand";
import type { Metal, Shape } from "@/entities/ring/model/types";

interface DesignerState {
  // location
  lat: number;
  lng: number;
  name: string;
  // design inputs
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
  shape: "rectangle",
  areaKm: 4,
  width: 24, // mm — plaque side
  relief: 2.0, // mm — max relief height
  thickness: 1.5, // mm — base thickness
  smooth: 2,
  showStreets: false,
  showBuildings: false,
  metal: "gold",
  setLocation: (lat, lng, name) => set({ lat, lng, name }),
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

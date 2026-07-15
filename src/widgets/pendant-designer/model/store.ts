import { create } from "zustand";
import type * as THREE from "three";
import type {
  HoleConfig,
  ObjectTransform,
  PendantConfig,
  PendantDesign,
  PendantShape,
  SilhouetteInfo,
} from "@/entities/pendant/model/types";
import { autoFit, defaultHole, mainContourMm, resolveHole } from "@/entities/pendant/lib/geometry";
import { createSegmentationService, type SegmentationProgress } from "@/features/image-segmentation";
import { parseSTL } from "@/features/stl-import/parseStl";

export type PendantStatus = "idle" | "processing" | "ready" | "error";
export type ViewMode = "2d" | "3d";

export interface ImportedStl {
  name: string;
  geometry: THREE.BufferGeometry;
  triangles: number;
  /** Bounding-box size in the file's units (assumed mm). */
  size: { x: number; y: number; z: number };
}

const MAX_HISTORY = 80;

const DEFAULT_CONFIG: PendantConfig = {
  shape: "circle",
  width: 28,
  height: 32,
  border: 1,
  thickness: 1,
  relief: 0.8,
  hole: { x: 0, y: -12.2, diameter: 2 },
};

const DEFAULT_OBJECT: ObjectTransform = { x: 0, y: 0, scale: 1, rotation: 0 };

const cloneDesign = (d: PendantDesign): PendantDesign => ({
  config: { ...d.config, hole: { ...d.config.hole } },
  object: { ...d.object },
});

interface PendantState {
  // pipeline
  status: PendantStatus;
  progress: SegmentationProgress | null;
  error: string | null;
  fileName: string | null;
  silhouette: SilhouetteInfo | null;
  // design (undoable)
  design: PendantDesign;
  past: PendantDesign[];
  future: PendantDesign[];
  // view (not undoable)
  showContour: boolean;
  showOriginal: boolean;
  showOutline: boolean;
  selected: boolean;
  stageScale: number;
  stageX: number;
  stageY: number;
  /** Bumped to ask the canvas to fit the pendant to the viewport. */
  fitNonce: number;
  viewMode: ViewMode;
  /** A user-uploaded STL previewed instead of the designed pendant. */
  importedStl: ImportedStl | null;
  // actions
  loadImage: (file: File) => Promise<void>;
  loadStlFile: (file: File) => Promise<void>;
  clearImportedStl: () => void;
  setViewMode: (mode: ViewMode) => void;
  setShape: (shape: PendantShape) => void;
  updateConfig: (patch: Partial<Omit<PendantConfig, "hole" | "shape">>, record?: boolean) => void;
  updateHole: (patch: Partial<HoleConfig>, record?: boolean) => void;
  updateObject: (patch: Partial<ObjectTransform>, record?: boolean) => void;
  /** Snapshot the design once at the start of a drag/slider gesture; follow-up
   *  updates in the same gesture pass record=false. */
  beginEdit: () => void;
  undo: () => void;
  redo: () => void;
  refit: () => void;
  toggleView: (key: "showContour" | "showOriginal" | "showOutline") => void;
  setSelected: (v: boolean) => void;
  setView: (scale: number, x: number, y: number) => void;
  requestFit: () => void;
}

export const usePendant = create<PendantState>((set, get) => {
  /** Apply a design mutation with hole-overlap clamping and optional history. */
  const apply = (mutate: (d: PendantDesign) => void, record: boolean) => {
    const state = get();
    const next = cloneDesign(state.design);
    mutate(next);
    next.config.hole = resolveHole(next, state.silhouette);
    set({
      design: next,
      past: record ? [...state.past, cloneDesign(state.design)].slice(-MAX_HISTORY) : state.past,
      future: record ? [] : state.future,
    });
  };

  return {
    status: "idle",
    progress: null,
    error: null,
    fileName: null,
    silhouette: null,
    design: { config: DEFAULT_CONFIG, object: DEFAULT_OBJECT },
    past: [],
    future: [],
    showContour: true,
    showOriginal: false,
    showOutline: true,
    selected: false,
    stageScale: 10,
    stageX: 0,
    stageY: 0,
    fitNonce: 0,
    viewMode: "2d",
    importedStl: null,

    loadImage: async (file) => {
      set({ status: "processing", error: null, progress: null, fileName: file.name, viewMode: "2d" });
      try {
        const service = createSegmentationService();
        const silhouette = await service.process(file, (progress) => set({ progress }));
        const { design } = get();
        const object = autoFit(design.config, silhouette);
        const next: PendantDesign = { config: cloneDesign(design).config, object };
        next.config.hole = {
          ...next.config.hole,
          ...defaultHole(next.config, mainContourMm(silhouette, object)),
        };
        next.config.hole = resolveHole(next, silhouette);
        set((s) => ({
          silhouette,
          status: "ready",
          progress: null,
          design: next,
          past: [],
          future: [],
          selected: false,
          fitNonce: s.fitNonce + 1,
        }));
      } catch (err) {
        set({
          status: "error",
          progress: null,
          error: err instanceof Error ? err.message : "Image processing failed",
        });
      }
    },

    loadStlFile: async (file) => {
      try {
        const geometry = parseSTL(await file.arrayBuffer());
        const box = geometry.boundingBox!;
        get().importedStl?.geometry.dispose();
        set({
          importedStl: {
            name: file.name,
            geometry,
            triangles: geometry.attributes.position.count / 3,
            size: {
              x: box.max.x - box.min.x,
              y: box.max.y - box.min.y,
              z: box.max.z - box.min.z,
            },
          },
          viewMode: "3d",
          error: null,
        });
      } catch (err) {
        set({
          status: "error",
          error: err instanceof Error ? err.message : "Failed to parse STL",
        });
      }
    },

    clearImportedStl: () => {
      get().importedStl?.geometry.dispose();
      set({ importedStl: null, viewMode: "2d" });
    },

    setViewMode: (viewMode) => set({ viewMode }),

    setShape: (shape) =>
      apply((d) => {
        d.config.shape = shape;
        const { silhouette } = get();
        const contour =
          silhouette && shape === "freeform" ? mainContourMm(silhouette, d.object) : null;
        const pos = defaultHole(d.config, contour);
        d.config.hole.x = pos.x;
        d.config.hole.y = pos.y;
      }, true),

    updateConfig: (patch, record = true) =>
      apply((d) => Object.assign(d.config, patch), record),

    updateHole: (patch, record = true) =>
      apply((d) => Object.assign(d.config.hole, patch), record),

    updateObject: (patch, record = true) =>
      apply((d) => Object.assign(d.object, patch), record),

    beginEdit: () => {
      const { design, past } = get();
      set({ past: [...past, cloneDesign(design)].slice(-MAX_HISTORY), future: [] });
    },

    undo: () => {
      const { past, future, design } = get();
      if (!past.length) return;
      set({
        design: past[past.length - 1],
        past: past.slice(0, -1),
        future: [cloneDesign(design), ...future].slice(0, MAX_HISTORY),
      });
    },

    redo: () => {
      const { past, future, design } = get();
      if (!future.length) return;
      set({
        design: future[0],
        future: future.slice(1),
        past: [...past, cloneDesign(design)].slice(-MAX_HISTORY),
      });
    },

    refit: () => {
      const { silhouette } = get();
      if (!silhouette) return;
      apply((d) => {
        d.object = autoFit(d.config, silhouette);
        const contour = d.config.shape === "freeform" ? mainContourMm(silhouette, d.object) : null;
        const pos = defaultHole(d.config, contour);
        d.config.hole.x = pos.x;
        d.config.hole.y = pos.y;
      }, true);
    },

    toggleView: (key) => set((s) => ({ [key]: !s[key] }) as Partial<PendantState>),
    setSelected: (selected) => set({ selected }),
    setView: (stageScale, stageX, stageY) => set({ stageScale, stageX, stageY }),
    requestFit: () => set((s) => ({ fitNonce: s.fitNonce + 1 })),
  };
});

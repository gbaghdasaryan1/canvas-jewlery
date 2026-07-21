import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { useDesigner } from "@/app/store";
import { useT } from "@/shared/i18n";
import { useElevation } from "@/entities/mountains/api/useElevation";
import { buildShapeMesh, hangAnchors, isRing, toShapeParams } from "@/entities/ring/model/types";
import { useBuildings } from "@/entities/buildings/api/useBuildings";
import { rasterizeBuildings } from "@/entities/buildings/lib/rasterizeBuildings";
import { GRID, PRESETS } from "@/shared/config/presets";
import { estimatePrice, JEWELRY_PRICE_AMD, formatAMD } from "@/shared/lib/pricing";
import { composeHeightField } from "@/shared/lib/heightField";
import { buildStlBlob } from "@/shared/lib/stl";
import { slugify } from "@/shared/lib/format";
import { useDebouncedValue } from "@/shared/lib/useDebouncedValue";
import { Panel } from "@/shared/ui/Panel";
import { MountainsMap } from "@/widgets/mountains-map/MountainsMap";
import { RingViewer } from "@/widgets/ring-viewer/RingViewer";
import { LocationSearch } from "@/features/location-search/LocationSearch";
import { RingControls } from "@/features/ring-controls/RingControls";
import { buildExportMesh } from "@/features/stl-export/buildExportMesh";
import { OrderModal, type OrderPayload } from "@/features/order";
import type { Shape } from "@/entities/ring/model/types";

const SHAPE_LABEL: Record<Shape, string> = {
  rectangle: "plaque",
  heart: "heart",
  circle: "disc",
};

// /maps overwrites the shared `relief` (down to ~1.15–2mm) — restore the
// mountains default whenever this designer mounts so returning from maps
// doesn't leave the relief flattened.
const MOUNTAINS_DEFAULT_RELIEF_MM = 4.6;

// City presets belong to the /maps studio — the mountains picker only offers
// natural landmarks.
const MOUNTAIN_PRESETS = PRESETS.filter((p) => !p.city);

// Default landmark for /mountains — the first natural preset (Mt Ararat). The
// designer store is a shared singleton, so visiting /maps (or moving the pin)
// leaves a stale location behind; we reset to this on mount.
const DEFAULT_MOUNTAIN = MOUNTAIN_PRESETS[0];

export function Step({ n, title, hint, children }: { n: number; title: string; hint: string; children: ReactNode }) {
  return (
    <section className="dz-step">
      <header className="dz-step-head">
        <span className="dz-step-n">{n}</span>
        <div>
          <h3>{title}</h3>
          <p>{hint}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

export function Designer() {
  const {
    lat, lng, name, jewelryType, hangPlace, hangSize, hangRotation, hangHorizontal, ringRotation, shape, areaKm, width, relief, thickness, smooth,
    showBuildings, metal, engraving, setRelief, setLocation, setAreaKm,
  } = useDesigner();
  const t = useT();
  const d = t.designer;

  // Reset to the mountains defaults on mount: relief (/maps clamps it low) and
  // the Mt Ararat landmark (the shared store may hold a stale /maps location).
  useEffect(() => {
    setRelief(MOUNTAINS_DEFAULT_RELIEF_MM);
    setLocation(DEFAULT_MOUNTAIN.lat, DEFAULT_MOUNTAIN.lng, DEFAULT_MOUNTAIN.name);
    if (DEFAULT_MOUNTAIN.areaKm) setAreaKm(DEFAULT_MOUNTAIN.areaKm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Debounce the location inputs feeding the network queries: dragging the
  // "Sample area" slider or mashing the nudge pad would otherwise fire a
  // full elevation run (~3k points) + an Overpass request per tick.
  const qLat = useDebouncedValue(lat, 350);
  const qLng = useDebouncedValue(lng, 350);
  const qAreaKm = useDebouncedValue(areaKm, 450);

  const elevation = useElevation(qLat, qLng, qAreaKm);
  const mountains = elevation.data ?? null;
  const buildings = useBuildings(qLat, qLng, qAreaKm, showBuildings);

  const structures = useMemo(
    () =>
      showBuildings && buildings.data?.length
        ? rasterizeBuildings(buildings.data, qLat, qLng, qAreaKm, GRID)
        : null,
    [showBuildings, buildings.data, qLat, qLng, qAreaKm],
  );

  const heightNorm = useMemo(
    () => (mountains ? composeHeightField(mountains.data, mountains.min, mountains.max, structures, smooth) : null),
    [mountains, structures, smooth],
  );
  const params = useMemo(
    () => toShapeParams(shape, { width, relief, thickness }, undefined, !isRing(jewelryType)),
    [shape, width, relief, thickness, jewelryType],
  );

  // Let React deprioritize the mesh rebuild while a slider is mid-drag —
  // the controls stay responsive and the 3D view catches up right after.
  const viewerHeightNorm = useDeferredValue(heightNorm);
  const viewerParams = useDeferredValue(params);

  const [orderOpen, setOrderOpen] = useState(false);

  // Built lazily when the user confirms the order — the mesh + volume integral
  // (for price) run once here instead of on every slider tick.
  function buildPayload(): OrderPayload | null {
    if (!heightNorm) return null;
    const mesh = buildExportMesh({
      shape, heightNorm, width, relief, thickness,
      jewelryType, hangPlace, hangSize, hangRotation, hangHorizontal, ringRotation,
    });
    if (!mesh) return null;
    const price = estimatePrice(buildShapeMesh(shape, heightNorm, params), metal);
    return {
      stl: buildStlBlob(mesh),
      fileName: `cairn-${slugify(name)}-${SHAPE_LABEL[shape]}.stl`,
      options: {
        product: "mountains",
        place: { name, lat, lng },
        jewelryType, shape, metal,
        width, relief, thickness, areaKm, smooth,
        hangPlace, hangSize, hangRotation, hangHorizontal, ringRotation,
        engraving,
        overlays: { buildings: showBuildings, streets: false },
        estimate: { amd: JEWELRY_PRICE_AMD[jewelryType], grams: price.grams },
      },
    };
  }

  const viewer = elevation.isLoading && !mountains ? (
    <div className="stage-msg mono">{d.readingMountains}</div>
  ) : (
    <RingViewer
      heightNorm={viewerHeightNorm}
      shape={shape}
      params={viewerParams}
      metal={metal}
      hangs={hangAnchors(shape, jewelryType, hangPlace)}
      hangSize={hangSize}
      hangRotation={hangRotation}
      hangHorizontal={hangHorizontal}
      jewelryType={jewelryType}
      ringRotation={ringRotation}
      engraving={engraving}
    />
  );

  return (
    <div className="dz-wrap">
      <div className="wrap dz">
        {/* Left — live preview + price/CTA (sticky on desktop) */}
        <aside className="dz-preview">
          <div className="panel viewer dz-stage">
            {/* <div className="cap">{d.previewCaption(d.formName[shape], d.jewelry[jewelryType], d.metals[metal])}</div> */}
            <div className="stage">{viewer}</div>
          </div>

          <div className="dz-buy">
            <div className="dz-place mono">{name}</div>
            <div className="dz-price-row">
              <span className="dz-price-label mono">{d.priceLabel} · {d.jewelry[jewelryType]}</span>
              <span className="dz-price-amount">{formatAMD(JEWELRY_PRICE_AMD[jewelryType])}</span>
            </div>
            <div className="dz-cta">
              <button
                className="btn-primary lg dz-order"
                onClick={() => setOrderOpen(true)}
                disabled={!heightNorm}
              >
                {d.order}
              </button>
            </div>
          </div>
        </aside>

        <OrderModal
          open={orderOpen}
          onClose={() => setOrderOpen(false)}
          summary={t.order.summary(name, d.formName[shape], d.metals[metal])}
          buildPayload={buildPayload}
        />

        {/* Right — guided configuration */}
        <div className="dz-config">
          <Step n={1} title={d.step1MountainsTitle} hint={""}>
            <LocationSearch presets={MOUNTAIN_PRESETS} />
            <Panel className="dz-mappanel" label={d.mapLabel}>
              <MountainsMap />

            </Panel>
          </Step>

          <Step n={2} title={d.step2Title} hint={d.step2MountainsHint}>
            <RingControls />
          </Step>
        </div>
      </div>
    </div>
  );
}

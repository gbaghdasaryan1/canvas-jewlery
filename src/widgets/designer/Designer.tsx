import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { useDesigner } from "@/app/store";
import { useElevation } from "@/entities/mountains/api/useElevation";
import { METALS, buildShapeMesh, hangAnchors, isRing, toShapeParams } from "@/entities/ring/model/types";
import { useBuildings } from "@/entities/buildings/api/useBuildings";
import { rasterizeBuildings } from "@/entities/buildings/lib/rasterizeBuildings";
import { GRID } from "@/shared/config/presets";
import { estimatePrice } from "@/shared/lib/pricing";
import { composeHeightField } from "@/shared/lib/heightField";
import { buildStlBlob } from "@/shared/lib/stl";
import { slugify } from "@/shared/lib/format";
import { useDebouncedValue } from "@/shared/lib/useDebouncedValue";
import { Panel } from "@/shared/ui/Panel";
import { MountainsMap } from "@/widgets/mountains-map/MountainsMap";
import { RingViewer } from "@/widgets/ring-viewer/RingViewer";
import { LocationSearch } from "@/features/location-search/LocationSearch";
import { RingControls } from "@/features/ring-controls/RingControls";
import { ExportButton } from "@/features/stl-export/ExportButton";
import { buildExportMesh } from "@/features/stl-export/buildExportMesh";
import { OrderModal, type OrderPayload } from "@/features/order";
import type { Shape } from "@/entities/ring/model/types";

const SHAPE_LABEL: Record<Shape, string> = {
  rectangle: "plaque",
  heart: "heart",
  circle: "disc",
};

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
    showBuildings, metal,
  } = useDesigner();
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
        overlays: { buildings: showBuildings, streets: false },
        estimate: { amd: price.amd, grams: price.grams },
      },
    };
  }

  const viewer = elevation.isLoading && !mountains ? (
    <div className="stage-msg mono">Reading mountains…</div>
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
    />
  );

  return (
    <div className="dz-wrap">
      <div className="wrap dz">
        {/* Left — live preview + price/CTA (sticky on desktop) */}
        <aside className="dz-preview">
          <div className="panel viewer dz-stage">
            <div className="cap">Your {SHAPE_LABEL[shape]} {jewelryType} · <b>{METALS[metal].label}</b></div>
            <div className="stage">{viewer}</div>
          </div>

          <div className="dz-buy">
            <div className="dz-place mono">{name}</div>
            <div className="dz-price-sub mono">made to order in 3–4 weeks</div>
            <div className="dz-cta">
              <button
                className="btn-primary lg dz-order"
                onClick={() => setOrderOpen(true)}
                disabled={!heightNorm}
              >
                Order this piece
              </button>
              <ExportButton heightNorm={heightNorm} />
            </div>
          </div>
        </aside>

        <OrderModal
          open={orderOpen}
          onClose={() => setOrderOpen(false)}
          summary={<>Ordering your <b>{name}</b> {SHAPE_LABEL[shape]} in {METALS[metal].label}.</>}
          buildPayload={buildPayload}
        />

        {/* Right — guided configuration */}
        <div className="dz-config">
          <Step n={1} title="Choose your place" hint="Search a spot, drop a pin, or nudge to frame it.">
            <LocationSearch />
            <Panel className="dz-mappanel" label={<>Map</>}>
              <MountainsMap />
            </Panel>
            {/* <div className="reliefrow">
              <div className="reliefwrap">
                <ReliefPreview
                  mountains={mountains}
                  smooth={smooth}
                  lat={lat}
                  lng={lng}
                  areaKm={areaKm}
                  streets={showStreets ? streets.data ?? null : null}
                  buildings={showBuildings ? buildings.data ?? null : null}
                />
                <div className="relief-toggles">
                  <button
                    className={`relief-toggle mono ${showStreets ? "on" : ""}`}
                    onClick={() => setShowStreets(!showStreets)}
                  >
                    {showStreets
                      ? streets.isFetching ? "Streets…" : streets.isError ? "Streets ✕" : "Streets ✓"
                      : "Streets"}
                  </button>
                  <button
                    className={`relief-toggle mono ${showBuildings ? "on" : ""}`}
                    onClick={() => setShowBuildings(!showBuildings)}
                  >
                    {showBuildings
                      ? buildings.isFetching ? "Buildings…" : buildings.isError ? "Buildings ✕" : "Buildings ✓"
                      : "Buildings"}
                  </button>
                </div>
              </div>
              <Readout lat={lat} lng={lng} areaKm={areaKm} mountains={mountains} />
            </div> */}
            <button
              className="dz-reread mono"
              onClick={() => elevation.refetch()}
              disabled={elevation.isFetching}
            >
              {elevation.isFetching ? "Reading mountains…" : "↻ Re-read mountains"}
            </button>
          </Step>

          <Step n={2} title="Shape &amp; finish" hint="Pick a form, then fine-tune the relief and metal.">
            <RingControls />
          </Step>
        </div>
      </div>
    </div>
  );
}

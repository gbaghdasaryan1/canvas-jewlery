import { useDeferredValue, useMemo, type ReactNode } from "react";
import { useDesigner } from "@/app/store";
import { useElevation } from "@/entities/terrain/api/useElevation";
import { METALS, buildShapeMesh, hangAnchor, hangPlaceLabel, toShapeParams } from "@/entities/ring/model/types";
import { useBuildings } from "@/entities/buildings/api/useBuildings";
import { rasterizeBuildings } from "@/entities/buildings/lib/rasterizeBuildings";
import { GRID } from "@/shared/config/presets";
import { estimatePrice, formatAMD } from "@/shared/lib/pricing";
import { composeHeightField } from "@/shared/lib/heightField";
import { useDebouncedValue } from "@/shared/lib/useDebouncedValue";
import { Panel } from "@/shared/ui/Panel";
import { TerrainMap } from "@/widgets/terrain-map/TerrainMap";
import { RingViewer } from "@/widgets/ring-viewer/RingViewer";
import { StlPreview } from "@/widgets/stl-preview/StlPreview";
import { LocationSearch } from "@/features/location-search/LocationSearch";
import { RingControls } from "@/features/ring-controls/RingControls";
import { ExportButton } from "@/features/stl-export/ExportButton";
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
    lat, lng, name, jewelryType, hangPlace, hangSize, hangRotation, hangHorizontal, shape, areaKm, width, relief, thickness, smooth,
    showBuildings, metal,
  } = useDesigner();
  // Debounce the location inputs feeding the network queries: dragging the
  // "Sample area" slider or mashing the nudge pad would otherwise fire a
  // full elevation run (~3k points) + an Overpass request per tick.
  const qLat = useDebouncedValue(lat, 350);
  const qLng = useDebouncedValue(lng, 350);
  const qAreaKm = useDebouncedValue(areaKm, 450);

  const elevation = useElevation(qLat, qLng, qAreaKm);
  const terrain = elevation.data ?? null;
  const buildings = useBuildings(qLat, qLng, qAreaKm, showBuildings);

  const structures = useMemo(
    () =>
      showBuildings && buildings.data?.length
        ? rasterizeBuildings(buildings.data, qLat, qLng, qAreaKm, GRID)
        : null,
    [showBuildings, buildings.data, qLat, qLng, qAreaKm],
  );

  const heightNorm = useMemo(
    () => (terrain ? composeHeightField(terrain.data, terrain.min, terrain.max, structures, smooth) : null),
    [terrain, structures, smooth],
  );
  const params = useMemo(
    () => toShapeParams(shape, { width, relief, thickness }),
    [shape, width, relief, thickness],
  );

  // Let React deprioritize the mesh rebuild while a slider is mid-drag —
  // the controls stay responsive and the 3D view catches up right after.
  const viewerHeightNorm = useDeferredValue(heightNorm);
  const viewerParams = useDeferredValue(params);

  function order() {
    // Price is only needed for the order email, so the mesh + volume
    // integral run once here instead of on every slider tick.
    const price = heightNorm
      ? estimatePrice(buildShapeMesh(shape, heightNorm, params), metal)
      : null;
    const subject = encodeURIComponent(`CAIRN — ${name} ${SHAPE_LABEL[shape]} ${jewelryType}`);
    const body = encodeURIComponent(
      `I'd like to order this piece:\n\n` +
      `Place: ${name} (${lat.toFixed(4)}, ${lng.toFixed(4)})\n` +
      `Type: ${jewelryType}\n` +
      (jewelryType === "pendant" ? `Hanging point: ${hangPlaceLabel(hangPlace)}\n` : "") +
      `Form: ${SHAPE_LABEL[shape]}\n` +
      `Metal: ${METALS[metal].label}\n` +
      `Estimate: ${price ? formatAMD(price.amd) : "—"}\n`,
    );
    window.location.href = `mailto:hello@cairn.studio?subject=${subject}&body=${body}`;
  }

  const viewer = elevation.isLoading && !terrain ? (
    <div className="stage-msg mono">Reading terrain…</div>
  ) : (
    <RingViewer
      heightNorm={viewerHeightNorm}
      shape={shape}
      params={viewerParams}
      metal={metal}
      hang={jewelryType === "pendant" ? hangAnchor(shape, hangPlace) : null}
      hangSize={hangSize}
      hangRotation={hangRotation}
      hangHorizontal={hangHorizontal}
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

          <div className="panel viewer dz-stl">
            <div className="cap">STL preview · <b>print geometry</b></div>
            <div className="stage">
              {heightNorm ? (
                <StlPreview
                  shape={shape}
                  heightNorm={heightNorm}
                  width={width}
                  relief={relief}
                  thickness={thickness}
                  jewelryType={jewelryType}
                  hangPlace={hangPlace}
                  hangSize={hangSize}
                  hangRotation={hangRotation}
                  hangHorizontal={hangHorizontal}
                  metal={metal}
                />
              ) : (
                <div className="stage-msg mono">No mesh yet</div>
              )}
            </div>
          </div>

          <div className="dz-buy">
            <div className="dz-place mono">{name}</div>
            <div className="dz-price-sub mono">made to order in 3–4 weeks</div>
            <div className="dz-cta">
              <button className="btn-primary lg dz-order" onClick={order}>
                Order this piece
              </button>
              <ExportButton heightNorm={heightNorm} />
            </div>
          </div>
        </aside>

        {/* Right — guided configuration */}
        <div className="dz-config">
          <Step n={1} title="Choose your place" hint="Search a spot, drop a pin, or nudge to frame it.">
            <LocationSearch />
            <Panel className="dz-mappanel" label={<>Map</>}>
              <TerrainMap />
            </Panel>
            {/* <div className="reliefrow">
              <div className="reliefwrap">
                <ReliefPreview
                  terrain={terrain}
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
              <Readout lat={lat} lng={lng} areaKm={areaKm} terrain={terrain} />
            </div> */}
            <button
              className="dz-reread mono"
              onClick={() => elevation.refetch()}
              disabled={elevation.isFetching}
            >
              {elevation.isFetching ? "Reading terrain…" : "↻ Re-read terrain"}
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

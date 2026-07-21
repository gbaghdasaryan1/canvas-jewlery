import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useDesigner } from "@/app/store";
import { useT } from "@/shared/i18n";
import { buildShapeMesh, hangAnchors, isRing, toShapeParams } from "@/entities/ring/model/types";
import { useBuildings } from "@/entities/buildings/api/useBuildings";
import { rasterizeBuildings } from "@/entities/buildings/lib/rasterizeBuildings";
import { useStreets } from "@/entities/streets/api/useStreets";
import { rasterizeStreets } from "@/entities/streets/lib/rasterizeStreets";
import { GRID, PRESETS } from "@/shared/config/presets";
import { estimatePrice, JEWELRY_PRICE_AMD, formatAMD } from "@/shared/lib/pricing";
import { composeCityField } from "@/shared/lib/heightField";
import { buildStlBlob } from "@/shared/lib/stl";
import { slugify } from "@/shared/lib/format";
import { useDebouncedValue } from "@/shared/lib/useDebouncedValue";
import { Panel } from "@/shared/ui/Panel";
import { CityMap } from "@/widgets/city-map/CityMap";
import { CityViewer } from "@/widgets/city-viewer/CityViewer";
import { buildCityMesh } from "@/widgets/city-viewer/buildCityMesh";
import { RingViewer } from "@/widgets/ring-viewer/RingViewer";
import { StlPreview } from "@/widgets/stl-preview/StlPreview";
import { LocationSearch } from "@/features/location-search/LocationSearch";
import { RingControls } from "@/features/ring-controls/RingControls";
import { buildExportMesh } from "@/features/stl-export/buildExportMesh";
import { OrderModal, type OrderPayload } from "@/features/order";
import type { Shape } from "@/entities/ring/model/types";
import { Step } from "./Designer";

const SHAPE_LABEL: Record<Shape, string> = {
  rectangle: "plaque",
  heart: "heart",
  circle: "disc",
};

const CITY_PRESETS = PRESETS.filter((p) => p.city);

type LayerMode = "all" | "buildings" | "streets";

const LAYER_OPTIONS: { mode: LayerMode; icon: JSX.Element }[] = [
  {
    mode: "all",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 3 8l9 5 9-5-9-5Z" />
        <path d="m3 13 9 5 9-5" />
      </svg>
    ),
  },
  {
    mode: "streets",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3 4 21" />
        <path d="M16 3l4 18" />
        <path d="M12 4v2M12 11v2M12 18v2" />
      </svg>
    ),
  },
];

const STREETS_RELIEF_MM = 1.15;
const DEFAULT_RELIEF_MM = 2; // caps at the maps relief max (see RingControls reliefMax)
const MAPS_RELIEF_MAX = 2;

export function SkylineDesigner() {
  const { lat, lng, name, jewelryType, hangPlace, hangSize, hangRotation, hangHorizontal, ringRotation, shape, areaKm, width, relief, thickness, smooth, metal, engraving, setLocation, setRelief } =
    useDesigner();
  const t = useT();
  const d = t.designer;

  // Stage view: "map" renders the fetched city in the Mapbox map's style
  // (same colors, three.js); "metal" shows the cast piece.
  const [stageView] = useState<"map" | "metal">("map");
  const [layerMode, setLayerMode] = useState<LayerMode>("streets");
  // STL print-geometry preview is collapsible — open by default on desktop,
  // closed on phones where the sticky preview column otherwise fills the screen.
  const [showStl, setShowStl] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 901px)").matches : true,
  );

  // Streets default to a shallow relief. Applied on mount (streets is the
  // default layer) and whenever the layer changes.
  useEffect(() => {
    setRelief(layerMode === "streets" ? STREETS_RELIEF_MM : DEFAULT_RELIEF_MM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerMode]);

  // Same debounce windows as Designer — dragging "Sample area" or mashing the
  // nudge pad must not fire an Overpass request per tick.
  const qLat = useDebouncedValue(lat, 350);
  const qLng = useDebouncedValue(lng, 350);
  const qAreaKm = useDebouncedValue(areaKm, 450);

  const buildings = useBuildings(qLat, qLng, qAreaKm, true);
  const streets = useStreets(qLat, qLng, qAreaKm, true);

  const buildingField = useMemo(
    () =>
      buildings.data?.length
        ? rasterizeBuildings(buildings.data, qLat, qLng, qAreaKm, GRID)
        : null,
    [buildings.data, qLat, qLng, qAreaKm],
  );
  const streetField = useMemo(
    () =>
      streets.data?.length ? rasterizeStreets(streets.data, qLat, qLng, qAreaKm, GRID) : null,
    [streets.data, qLat, qLng, qAreaKm],
  );

  const heightNorm = useMemo(() => {
    const bField = layerMode !== "streets" ? buildingField : null;
    const sField = layerMode !== "buildings" ? streetField : null;
    return bField || sField ? composeCityField(bField, sField, smooth) : null;
  }, [buildingField, streetField, smooth, layerMode]);

  const params = useMemo(
    () => toShapeParams(shape, { width, relief, thickness }, undefined, !isRing(jewelryType)),
    [shape, width, relief, thickness, jewelryType],
  );

  const viewerHeightNorm = useDeferredValue(heightNorm);
  const viewerParams = useDeferredValue(params);

  const activeBuildings = layerMode !== "streets" ? buildings.data ?? null : null;
  const activeStreets = layerMode !== "buildings" ? streets.data ?? null : null;

  // Streets-only pieces are hollow (no base plate), so there's no solid back to
  // laser-engrave. Engraving is only offered when a solid floor is present.
  const canEngrave = layerMode !== "streets";
  const activeEngraving = canEngrave ? engraving : "";
  const solidFloor = layerMode !== "streets";

  // The STL is built from the same vector data + clipping the canvas renders,
  // so the downloaded file matches what's on screen exactly.
  function exportMesh() {
    return buildCityMesh({
      buildings: activeBuildings,
      streets: activeStreets,
      shape,
      lat: qLat,
      lng: qLng,
      areaKm: qAreaKm,
      widthMm: width,
      baseMm: Math.max(0.5, thickness),
      reliefMm: relief,
      solidFloor,
      // Ring yaws its band (below); every other type turns the inner content.
      contentYawDeg: isRing(jewelryType) ? 0 : ringRotation,
    });
  }

  const [orderOpen, setOrderOpen] = useState(false);

  // Built lazily on confirm. The STL comes from the same vector city mesh the
  // canvas shows (via exportMesh), so the ordered file matches the preview.
  function buildPayload(): OrderPayload | null {
    if (!heightNorm) return null;
    const mesh = buildExportMesh({
      shape, heightNorm, width, relief, thickness,
      jewelryType, hangPlace, hangSize, hangRotation, hangHorizontal, ringRotation,
      exportMesh,
    });
    if (!mesh) return null;
    const price = estimatePrice(buildShapeMesh(shape, heightNorm, params), metal);
    return {
      stl: buildStlBlob(mesh),
      fileName: `cairn-${slugify(name)}-skyline-${SHAPE_LABEL[shape]}.stl`,
      options: {
        product: "skyline",
        place: { name, lat, lng },
        jewelryType, shape, metal,
        width, relief, thickness, areaKm, smooth,
        hangPlace, hangSize, hangRotation, hangHorizontal, ringRotation,
        engraving: activeEngraving,
        overlays: { buildings: layerMode !== "streets", streets: layerMode !== "buildings" },
        estimate: { amd: JEWELRY_PRICE_AMD[jewelryType], grams: price.grams },
      },
    };
  }

  const hangs = hangAnchors(shape, jewelryType, hangPlace);

  const relevantLoading =
    (layerMode !== "streets" && buildings.isLoading) ||
    (layerMode !== "buildings" && streets.isLoading);
  const loading = relevantLoading && !heightNorm;
  const empty =
    !loading &&
    !(layerMode !== "streets" && buildings.isLoading) &&
    !(layerMode !== "buildings" && streets.isLoading) &&
    !heightNorm;

  const viewer = loading ? (
    <div className="stage-msg mono">{d.readingCity}</div>
  ) : empty ? (
    <div className="stage-msg mono">{d.noCity}</div>
  ) : stageView === "map" ? (
    <CityViewer
      buildings={activeBuildings}
      streets={activeStreets}
      shape={shape}
      lat={qLat}
      lng={qLng}
      areaKm={qAreaKm}
      widthMm={width}
      thicknessMm={thickness}
      reliefMm={relief}
      hangs={hangs}
      hangSize={hangSize}
      hangRotation={hangRotation}
      hangHorizontal={hangHorizontal}
      solidFloor={solidFloor}
      jewelryType={jewelryType}
      ringRotation={ringRotation}
      engraving={activeEngraving}
    />
  ) : (
    <RingViewer
      heightNorm={viewerHeightNorm}
      shape={shape}
      params={viewerParams}
      metal={metal}
      hangs={hangs}
      hangSize={hangSize}
      hangRotation={hangRotation}
      hangHorizontal={hangHorizontal}
      jewelryType={jewelryType}
      ringRotation={ringRotation}
      engraving={activeEngraving}
    />
  );

  return (
    <div className="dz-wrap">
      <div className="wrap dz">
        {/* Left — live preview + CTA (sticky on desktop) */}
        <aside className="dz-preview">
          <div className="panel viewer dz-stage">
            <div className="cap">{d.skylineCaption(d.jewelry[jewelryType], d.metals[metal])}</div>

            <div className="stage">{viewer}</div>
          </div>

          <div className={`panel viewer dz-stl ${showStl ? "open" : "collapsed"}`}>
            <button
              className="dz-stl-head"
              onClick={() => setShowStl((v) => !v)}
              aria-expanded={showStl}
            >
              <span className="dz-stl-title mono">{d.stlPreview}</span>
              <span className="dz-stl-toggle mono">{showStl ? d.stlHide : d.stlShow}</span>
            </button>
            {showStl && (
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
                    ringRotation={ringRotation}
                    exportMesh={exportMesh}
                    metal={metal}
                  />
                ) : (
                  <div className="stage-msg mono">{d.noMesh}</div>
                )}
              </div>
            )}
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
          summary={t.order.skylineSummary(name, d.formName[shape], d.metals[metal])}
          buildPayload={buildPayload}
        />

        {/* Right — guided configuration */}
        <div className="dz-config">
          <Step n={1} title={d.step1CityTitle} hint={""}>
            <LocationSearch presets={CITY_PRESETS} placeholder={d.searchCityPlaceholder} />
            <Panel className="dz-mappanel" label={d.cityMapLabel}>
              <CityMap lat={lat} lng={lng} onSelect={(la, lo) => setLocation(la, lo, d.customLocation)} />
            </Panel>
            {(buildings.isFetching || streets.isFetching) && (
              <div className="search-msg mono">{d.fetchingOsm}</div>
            )}
            {(buildings.isError || streets.isError) && (
              <div className="search-msg mono">{d.osmBusy}</div>
            )}
          </Step>

          <Step n={2} title={d.step2Title} hint={d.step2CityHint}>
            <div className="field">
              <label>{d.renderLayers}</label>
              <div className="layer-seg" role="radiogroup" aria-label={d.renderLayers}>
                {LAYER_OPTIONS.map((opt) => (
                  <button
                    key={opt.mode}
                    type="button"
                    role="radio"
                    aria-checked={layerMode === opt.mode}
                    className={`layer-seg-btn ${layerMode === opt.mode ? "on" : ""}`}
                    onClick={() => setLayerMode(opt.mode)}
                  >
                    <span className="layer-seg-ico" aria-hidden>{opt.icon}</span>
                    <span className="layer-seg-label">{d.layers[opt.mode]}</span>
                  </button>
                ))}
              </div>
            </div>
            <RingControls areaMin={0.1} areaMax={5} reliefMax={MAPS_RELIEF_MAX} showEngraving={canEngrave} />
          </Step>
        </div>
      </div>
    </div>
  );
}

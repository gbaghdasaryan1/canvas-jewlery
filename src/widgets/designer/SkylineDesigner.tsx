import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useDesigner } from "@/app/store";
import { METALS, buildShapeMesh, hangAnchor, hangPlaceLabel, toShapeParams } from "@/entities/ring/model/types";
import { useBuildings } from "@/entities/buildings/api/useBuildings";
import { rasterizeBuildings } from "@/entities/buildings/lib/rasterizeBuildings";
import { useStreets } from "@/entities/streets/api/useStreets";
import { rasterizeStreets } from "@/entities/streets/lib/rasterizeStreets";
import { GRID, PRESETS } from "@/shared/config/presets";
import { estimatePrice, formatAMD } from "@/shared/lib/pricing";
import { composeCityField } from "@/shared/lib/heightField";
import { useDebouncedValue } from "@/shared/lib/useDebouncedValue";
import { Panel } from "@/shared/ui/Panel";
import { CityMap } from "@/widgets/city-map/CityMap";
import { CityViewer } from "@/widgets/city-viewer/CityViewer";
import { buildCityMesh } from "@/widgets/city-viewer/buildCityMesh";
import { RingViewer } from "@/widgets/ring-viewer/RingViewer";
import { StlPreview } from "@/widgets/stl-preview/StlPreview";
import { LocationSearch } from "@/features/location-search/LocationSearch";
import { RingControls } from "@/features/ring-controls/RingControls";
import { ExportButton } from "@/features/stl-export/ExportButton";
import type { Shape } from "@/entities/ring/model/types";
import { Step } from "./Designer";

const SHAPE_LABEL: Record<Shape, string> = {
  rectangle: "plaque",
  heart: "heart",
  circle: "disc",
};

const CITY_PRESETS = PRESETS.filter((p) => p.city);

type LayerMode = "all" | "buildings" | "streets";

const LAYER_OPTIONS: { mode: LayerMode; label: string; icon: JSX.Element }[] = [
  {
    mode: "all",
    label: "All",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 3 8l9 5 9-5-9-5Z" />
        <path d="m3 13 9 5 9-5" />
      </svg>
    ),
  },
  {
    mode: "buildings",
    label: "Buildings",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 21V9l6-4v16" />
        <path d="M10 21V11l8-3v13" />
        <path d="M3 21h18" />
        <path d="M14 12h.01M14 15h.01M7 12h.01M7 15h.01" />
      </svg>
    ),
  },
  {
    mode: "streets",
    label: "Streets",
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
const DEFAULT_RELIEF_MM = 4;

export function SkylineDesigner() {
  const { lat, lng, name, jewelryType, hangPlace, hangSize, hangRotation, hangHorizontal, shape, areaKm, width, relief, thickness, smooth, metal, setLocation, setRelief } =
    useDesigner();

  // Stage view: "map" renders the fetched city in the Mapbox map's style
  // (same colors, three.js); "metal" shows the cast piece.
  const [stageView] = useState<"map" | "metal">("map");
  const [layerMode, setLayerMode] = useState<LayerMode>("streets");

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
    () => toShapeParams(shape, { width, relief, thickness }),
    [shape, width, relief, thickness],
  );

  const viewerHeightNorm = useDeferredValue(heightNorm);
  const viewerParams = useDeferredValue(params);

  const activeBuildings = layerMode !== "streets" ? buildings.data ?? null : null;
  const activeStreets = layerMode !== "buildings" ? streets.data ?? null : null;

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
      solidFloor: layerMode !== "streets",
    });
  }

  function order() {
    const price = heightNorm
      ? estimatePrice(buildShapeMesh(shape, heightNorm, params), metal)
      : null;
    const subject = encodeURIComponent(`CAIRN — ${name} skyline ${SHAPE_LABEL[shape]} ${jewelryType}`);
    const body = encodeURIComponent(
      `I'd like to order this piece:\n\n` +
      `Place: ${name} (${lat.toFixed(4)}, ${lng.toFixed(4)})\n` +
      `Type: ${jewelryType}\n` +
      (jewelryType === "pendant" ? `Hanging point: ${hangPlaceLabel(hangPlace)}\n` : "") +
      `Form: skyline ${SHAPE_LABEL[shape]}\n` +
      `Metal: ${METALS[metal].label}\n` +
      `Estimate: ${price ? formatAMD(price.amd) : "—"}\n`,
    );
    window.location.href = `mailto:hello@cairn.studio?subject=${subject}&body=${body}`;
  }

  const hang = jewelryType === "pendant" ? hangAnchor(shape, hangPlace) : null;

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
    <div className="stage-msg mono">Reading the city…</div>
  ) : empty ? (
    <div className="stage-msg mono">No buildings or streets here — try a city spot.</div>
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
      hang={hang}
      hangSize={hangSize}
      hangRotation={hangRotation}
      hangHorizontal={hangHorizontal}
      solidFloor={layerMode !== "streets"}
    />
  ) : (
    <RingViewer
      heightNorm={viewerHeightNorm}
      shape={shape}
      params={viewerParams}
      metal={metal}
      hang={hang}
      hangSize={hangSize}
      hangRotation={hangRotation}
      hangHorizontal={hangHorizontal}
    />
  );

  return (
    <div className="dz-wrap">
      <div className="wrap dz">
        {/* Left — live preview + CTA (sticky on desktop) */}
        <aside className="dz-preview">
          <div className="panel viewer dz-stage">
            <div className="cap">Your skyline {jewelryType} · <b>{METALS[metal].label}</b></div>

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
                  exportMesh={exportMesh}
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
              <ExportButton heightNorm={heightNorm} tag="skyline" exportMesh={exportMesh} />
            </div>
          </div>
        </aside>

        {/* Right — guided configuration */}
        <div className="dz-config">
          <Step n={1} title="Choose your city" hint="Search a city, drop a pin on a favorite block, or nudge to frame it.">
            <LocationSearch
              presets={CITY_PRESETS}
              placeholder="Search a city — e.g. Yerevan, Manhattan, Hong Kong…"
            />
            <Panel className="dz-mappanel" label={<>City map · <b>3D</b></>}>
              <CityMap lat={lat} lng={lng} onSelect={(la, lo) => setLocation(la, lo, "Custom location")} />
            </Panel>
            {(buildings.isFetching || streets.isFetching) && (
              <div className="search-msg mono">Fetching buildings &amp; streets from OpenStreetMap…</div>
            )}
            {(buildings.isError || streets.isError) && (
              <div className="search-msg mono">
                OpenStreetMap is busy — some data may be missing. Try a smaller area or re-pick the spot.
              </div>
            )}
          </Step>

          <Step n={2} title="Shape &amp; finish" hint="Pick a form, then fine-tune the relief and metal.">
            <div className="field">
              <label>Render layers</label>
              <div className="layer-seg" role="radiogroup" aria-label="Render layers">
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
                    <span className="layer-seg-label">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <RingControls areaMin={0.1} areaMax={5} />
          </Step>
        </div>
      </div>
    </div>
  );
}

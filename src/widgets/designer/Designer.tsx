import { useMemo, type ReactNode } from "react";
import { useDesigner } from "@/app/store";
import { useElevation } from "@/entities/terrain/api/useElevation";
import { METALS, buildShapeMesh, toShapeParams } from "@/entities/ring/model/types";
import { useBuildings } from "@/entities/buildings/api/useBuildings";
import { rasterizeBuildings } from "@/entities/buildings/lib/rasterizeBuildings";
import { useCity } from "@/entities/city/api/useCity";
import { buildCityMesh } from "@/entities/city/lib/buildCityMesh";
import { GRID } from "@/shared/config/presets";
import { estimatePrice, priceFromVolume, formatAMD } from "@/shared/lib/pricing";
import { composeHeightField } from "@/shared/lib/heightField";
import { Panel } from "@/shared/ui/Panel";
import { TerrainMap } from "@/widgets/terrain-map/TerrainMap";
import { RingViewer } from "@/widgets/ring-viewer/RingViewer";
import { CityViewer } from "@/widgets/city-viewer/CityViewer";
import { LocationSearch } from "@/features/location-search/LocationSearch";
import { RingControls } from "@/features/ring-controls/RingControls";
import { ExportButton } from "@/features/stl-export/ExportButton";
import type { Shape } from "@/entities/ring/model/types";

const SHAPE_LABEL: Record<Shape, string> = {
  rectangle: "plaque",
  heart: "heart",
  circle: "disc",
  skyline: "skyline",
};

function Step({ n, title, hint, children }: { n: number; title: string; hint: string; children: ReactNode }) {
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
    lat, lng, name, shape, areaKm, width, relief, thickness, smooth,
    showBuildings, metal,
  } = useDesigner();
  const isSkyline = shape === "skyline";
  const elevation = useElevation(lat, lng, areaKm);
  const terrain = elevation.data ?? null;
  // const streets = useStreets(lat, lng, areaKm, showStreets);
  const buildings = useBuildings(lat, lng, areaKm, showBuildings);
  const city = useCity(lat, lng, areaKm, isSkyline);

  const cityMesh = useMemo(
    () =>
      isSkyline && city.data
        ? buildCityMesh(city.data, { lat, lng, areaKm, plateMm: width, baseMm: thickness, vScale: relief })
        : null,
    [isSkyline, city.data, lat, lng, areaKm, width, thickness, relief],
  );

  const structures = useMemo(
    () =>
      showBuildings && buildings.data?.length
        ? rasterizeBuildings(buildings.data, lat, lng, areaKm, GRID)
        : null,
    [showBuildings, buildings.data, lat, lng, areaKm],
  );

  const heightNorm = useMemo(
    () => (terrain ? composeHeightField(terrain.data, terrain.min, terrain.max, structures, smooth) : null),
    [terrain, structures, smooth],
  );
  const params = useMemo(
    () => toShapeParams(shape, { width, relief, thickness }),
    [shape, width, relief, thickness],
  );

  const price = useMemo(() => {
    if (isSkyline) return cityMesh ? priceFromVolume(cityMesh.volumeMm3, metal) : null;
    if (!heightNorm) return null;
    return estimatePrice(buildShapeMesh(shape, heightNorm, params), metal);
  }, [isSkyline, cityMesh, heightNorm, shape, params, metal]);

  function order() {
    const subject = encodeURIComponent(`CAIRN — ${name} ${SHAPE_LABEL[shape]}`);
    const body = encodeURIComponent(
      `I'd like to order this piece:\n\n` +
      `Place: ${name} (${lat.toFixed(4)}, ${lng.toFixed(4)})\n` +
      `Form: ${SHAPE_LABEL[shape]}\n` +
      `Metal: ${METALS[metal].label}\n` +
      `Estimate: ${price ? formatAMD(price.amd) : "—"}\n`,
    );
    window.location.href = `mailto:hello@cairn.studio?subject=${subject}&body=${body}`;
  }

  const viewer = isSkyline ? (
    city.isLoading && !cityMesh ? (
      <div className="stage-msg mono">Building city…</div>
    ) : city.isError ? (
      <div className="stage-msg mono">Couldn't reach the map data — try again.</div>
    ) : city.data && city.data.buildings.length === 0 ? (
      <div className="stage-msg mono">No buildings here — search a city (e.g. Manhattan, Dubai).</div>
    ) : (
      <CityViewer mesh={cityMesh} />
    )
  ) : elevation.isLoading && !terrain ? (
    <div className="stage-msg mono">Reading terrain…</div>
  ) : (
    <RingViewer heightNorm={heightNorm} shape={shape} params={params} metal={metal} />
  );

  return (
    <div className="dz-wrap">
      <div className="wrap dz">
        {/* Left — live preview + price/CTA (sticky on desktop) */}
        <aside className="dz-preview">
          <div className="panel viewer dz-stage">
            <div className="cap">Your {SHAPE_LABEL[shape]} · <b>{METALS[metal].label}</b></div>
            <div className="stage">{viewer}</div>
          </div>

          <div className="dz-buy">
            <div className="dz-place mono">{name}</div>
            <div className="dz-price-sub mono">made to order in 3–4 weeks</div>
            <div className="dz-cta">
              <button className="btn-primary lg dz-order" onClick={order}>
                Order this piece
              </button>
              <ExportButton />
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

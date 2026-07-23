import type { StyleSpecification } from "mapbox-gl";

/**
 * Custom Mapbox style over the Streets v8 vector tileset
 * (mapbox://mapbox.mapbox-streets-v8), themed to the CAIRN silver palette.
 *
 * Kept separate from the map component so styling can be iterated on
 * independently. Data-driven expressions (match / step / interpolate) are used
 * instead of one layer per class, per the Streets-v8 styling guidance.
 */

/** Layer ids that get click/hover interactivity in <CityMap>. */
export const INTERACTIVE_LAYERS = ["road-line", "poi-label", "place-label"];

/** Language-fallback label: user's language → English → local name. */
function nameExpr(lang: string): unknown {
  const fields = lang && lang !== "en" ? [`name_${lang}`, "name_en"] : ["name_en"];
  return ["coalesce", ...fields.map((f) => ["get", f]), ["get", "name"]];
}

const FONT_REGULAR = ["DIN Pro Regular", "Arial Unicode MS Regular"];
const FONT_MEDIUM = ["DIN Pro Medium", "Arial Unicode MS Regular"];

/** Per-class road color; hover (via feature-state) tints toward the accent. */
const ROAD_COLOR = [
  "case",
  ["boolean", ["feature-state", "hover"], false],
  "#74808d",
  [
    "match",
    ["get", "class"],
    ["motorway", "trunk"],
    "#b9c2cc",
    ["primary", "secondary"],
    "#ffffff",
    ["tertiary"],
    "#fbfcfd",
    ["street", "street_limited", "service", "track"],
    "#f2f4f6",
    ["path", "pedestrian"],
    "#e9ecef",
    ["major_rail", "minor_rail"],
    "#c3c9d0",
    "#eef0f3",
  ],
];

/** Zoom-scaled, class-dependent road width. */
const ROAD_WIDTH = [
  "interpolate",
  ["exponential", 1.5],
  ["zoom"],
  5,
  ["match", ["get", "class"], ["motorway", "trunk"], 0.8, ["primary"], 0.5, 0.2],
  12,
  [
    "match",
    ["get", "class"],
    ["motorway", "trunk"],
    2.6,
    ["primary", "secondary"],
    1.8,
    ["tertiary"],
    1.2,
    ["major_rail", "minor_rail"],
    0.8,
    0.7,
  ],
  16,
  [
    "match",
    ["get", "class"],
    ["motorway", "trunk"],
    11,
    ["primary", "secondary"],
    8,
    ["tertiary"],
    6,
    ["street", "street_limited"],
    5,
    ["major_rail", "minor_rail"],
    1.6,
    3,
  ],
];

/** Admin boundaries: worldview-filtered per the Streets-v8 requirements. */
const ADMIN_BASE_FILTER = [
  "all",
  ["<=", ["get", "admin_level"], 2],
  ["==", ["get", "maritime"], "false"],
  ["any", ["==", ["get", "worldview"], "all"], ["==", ["get", "worldview"], "US"]],
];

export function buildCityStyle(lang: string): StyleSpecification {
  const NAME = nameExpr(lang);

  return {
    version: 8,
    name: "CAIRN Silver Streets",
    glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
    sprite: "mapbox://sprites/mapbox/streets-v12", // maki icon set
    sources: {
      streets: { type: "vector", url: "mapbox://mapbox.mapbox-streets-v8" },
    },
    light: { anchor: "viewport", color: "#ffffff", intensity: 0.32 },
    layers: [
      { id: "background", type: "background", paint: { "background-color": "#e6e8eb" } },

      {
        id: "landuse",
        type: "fill",
        source: "streets",
        "source-layer": "landuse",
        minzoom: 5,
        filter: [
          "match",
          ["get", "class"],
          [
            "park",
            "grass",
            "pitch",
            "wood",
            "scrub",
            "cemetery",
            "residential",
            "industrial",
            "airport",
            "hospital",
            "school",
            "sand",
            "glacier",
          ],
          true,
          false,
        ],
        paint: {
          "fill-color": [
            "match",
            ["get", "class"],
            ["park", "grass", "pitch"],
            "#dde5dd",
            ["wood", "scrub"],
            "#d4ddd4",
            ["cemetery"],
            "#dce2dc",
            ["residential"],
            "#e3e5e9",
            ["industrial"],
            "#dcdee3",
            ["airport"],
            "#e0e3e8",
            ["hospital", "school"],
            "#e2e3e6",
            ["sand"],
            "#e8e7e2",
            ["glacier"],
            "#eef1f4",
            "#e6e8eb",
          ],
        },
      },
      {
        id: "landuse-overlay",
        type: "fill",
        source: "streets",
        "source-layer": "landuse_overlay",
        minzoom: 5,
        paint: {
          "fill-color": [
            "match",
            ["get", "class"],
            "national_park",
            "#dbe4db",
            "wetland",
            "#dbe2e6",
            "wetland_noveg",
            "#dee4e7",
            "#e6e8eb",
          ],
          "fill-opacity": 0.6,
        },
      },

      {
        id: "water",
        type: "fill",
        source: "streets",
        "source-layer": "water",
        paint: { "fill-color": "#c2ccd6", "fill-outline-color": "#b2bec9" },
      },
      {
        id: "waterway",
        type: "line",
        source: "streets",
        "source-layer": "waterway",
        minzoom: 8,
        filter: [
          "match",
          ["get", "class"],
          ["river", "canal", "stream", "drain", "ditch"],
          true,
          false,
        ],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#bcc8d3",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            ["match", ["get", "class"], "river", 1, "canal", 0.7, 0.4],
            16,
            ["match", ["get", "class"], "river", 4.5, "canal", 2.5, 1.2],
          ],
        },
      },

      {
        id: "road-line",
        type: "line",
        source: "streets",
        "source-layer": "road",
        minzoom: 3,
        filter: [
          "match",
          ["get", "class"],
          ["ferry", "ferry_auto", "aerialway", "golf"],
          false,
          true,
        ],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ROAD_COLOR, "line-width": ROAD_WIDTH },
      },

      {
        id: "building-3d",
        type: "fill-extrusion",
        source: "streets",
        "source-layer": "building",
        minzoom: 13,
        filter: ["all", ["==", ["get", "extrude"], "true"], ["!=", ["get", "underground"], "true"]],
        paint: {
          "fill-extrusion-color": [
            "interpolate",
            ["linear"],
            ["get", "height"],
            0,
            "#d6dade",
            60,
            "#dfe3e8",
            180,
            "#eef1f5",
          ],
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "min_height"],
          "fill-extrusion-opacity": 0.92,
        },
      },

      {
        id: "admin",
        type: "line",
        source: "streets",
        "source-layer": "admin",
        minzoom: 0,
        filter: ["all", ...ADMIN_BASE_FILTER.slice(1), ["==", ["get", "disputed"], "false"]],
        paint: {
          "line-color": "#9aa1ab",
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 10, 1.6],
        },
      },
      {
        id: "admin-disputed",
        type: "line",
        source: "streets",
        "source-layer": "admin",
        minzoom: 0,
        filter: ["all", ...ADMIN_BASE_FILTER.slice(1), ["==", ["get", "disputed"], "true"]],
        paint: {
          "line-color": "#9aa1ab",
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 10, 1.6],
          "line-dasharray": [2, 2.5],
        },
      },

      {
        id: "housenum-label",
        type: "symbol",
        source: "streets",
        "source-layer": "housenum_label",
        minzoom: 16,
        layout: { "text-field": ["get", "house_num"], "text-font": FONT_REGULAR, "text-size": 9.5 },
        paint: { "text-color": "#9aa1ab", "text-halo-color": "#ffffff", "text-halo-width": 1 },
      },
      {
        id: "natural-label",
        type: "symbol",
        source: "streets",
        "source-layer": "natural_label",
        minzoom: 4,
        layout: {
          "text-field": NAME,
          "text-font": FONT_REGULAR,
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 14, 14],
          "icon-image": ["get", "maki"],
        },
        paint: {
          "text-color": [
            "match",
            ["get", "class"],
            ["water", "sea", "ocean", "reservoir", "river", "canal", "bay", "stream"],
            "#6c7d8c",
            "#6b7280",
          ],
          "text-halo-color": "#ffffff",
          "text-halo-width": 1,
        },
      },
      {
        id: "transit-label",
        type: "symbol",
        source: "streets",
        "source-layer": "transit_stop_label",
        minzoom: 14,
        layout: {
          "text-field": NAME,
          "text-font": FONT_REGULAR,
          "text-size": 10,
          "text-offset": [0, 1],
          "text-anchor": "top",
          "icon-image": ["get", "maki"],
        },
        paint: { "text-color": "#5a626d", "text-halo-color": "#ffffff", "text-halo-width": 1 },
      },
      {
        id: "poi-label",
        type: "symbol",
        source: "streets",
        "source-layer": "poi_label",
        minzoom: 13,
        filter: ["<=", ["get", "filterrank"], 3], // label density control
        layout: {
          "text-field": NAME,
          "text-font": FONT_REGULAR,
          "text-size": 11,
          "text-offset": [0, 1],
          "text-anchor": "top",
          "icon-image": ["get", "maki"],
        },
        paint: { "text-color": "#5a626d", "text-halo-color": "#ffffff", "text-halo-width": 1.2 },
      },
      {
        id: "place-label",
        type: "symbol",
        source: "streets",
        "source-layer": "place_label",
        minzoom: 0,
        filter: [
          "match",
          ["get", "class"],
          ["country", "state", "settlement", "settlement_subdivision"],
          true,
          false,
        ],
        layout: {
          "text-field": NAME,
          "text-font": [
            "match",
            ["get", "class"],
            ["country", "settlement"],
            FONT_MEDIUM,
            FONT_REGULAR,
          ],
          // symbolrank drives prominence: low rank (major places) → larger text
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2,
            ["step", ["get", "symbolrank"], 12, 4, 10, 8, 9],
            12,
            ["step", ["get", "symbolrank"], 20, 4, 17, 8, 14, 12, 12],
          ],
        },
        paint: { "text-color": "#3c434c", "text-halo-color": "#ffffff", "text-halo-width": 1.4 },
      },
    ],
  } as unknown as StyleSpecification;
}

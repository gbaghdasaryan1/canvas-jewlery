export interface Preset {
  name: string;
  lat: number;
  lng: number;
  areaKm?: number;
  city?: boolean;
}

export const PRESETS: Preset[] = [
  // Himalaya / Karakoram
  { name: "Everest",       lat:  27.9881, lng:  86.9250, areaKm: 22 },
  { name: "K2",            lat:  35.8808, lng:  76.5133, areaKm: 13.6 },
  // Europe
  { name: "Matterhorn",    lat:  45.9765, lng:   7.6587, areaKm: 10.7 },
  { name: "Mont Blanc",    lat:  45.8326, lng:   6.8652, areaKm: 20 },
  // Caucasus
  { name: "Mt Ararat",     lat:  39.6841381927097, lng:  44.33252033660726, areaKm: 33.9 },
  { name: "Mt Aragats",     lat:  40.5231859, lng:  44.1946308, areaKm: 13.2 },
  // Africa
  { name: "Kilimanjaro",   lat:  -3.0791050727107345, lng:  37.40310593919752, areaKm: 33.2 },
  { name: "Table Mountain", lat: -33.9575, lng:  18.4028, areaKm: 3 },
  // Asia-Pacific
  { name: "Mt Fuji",       lat:  35.3607, lng: 138.7274, areaKm: 8.7 },
  // North America
  { name: "Grand Canyon",  lat:  36.2051, lng:-113.0545, areaKm: 14 },
  { name: "Half Dome",     lat:  37.7459, lng:-119.5332, areaKm: 2 },
  // Armenia / Caucasus
  { name: "Mount Azhdahak",    lat:  40.2556, lng:  44.9319, areaKm: 10 },
  { name: "Mount Khustup",     lat:  39.1508, lng:  46.3275, areaKm: 9 },
  { name: "Mount Ara",         lat:  40.4506, lng:  44.4694, areaKm: 7 },
  { name: "Mount Kaputjugh",   lat:  39.7089, lng:  46.1319, areaKm: 12 },
  { name: "Mount Ishkhanasar", lat:  39.5511, lng:  46.1492, areaKm: 8 },
  { name: "Mount Spitakasar",  lat:  39.7906, lng:  45.9028, areaKm: 9 },
  { name: "Mount Tsghuk",      lat:  39.6703, lng:  45.6936, areaKm: 11 },
  { name: "Mount Arteni",      lat:  40.2944, lng:  43.7631, areaKm: 6 },
  { name: "Mount Yeranos",     lat:  40.3514, lng:  45.2108, areaKm: 5 },
  { name: "Mount Elbrus",      lat:  43.3550, lng:  42.4392, areaKm: 20 },
  // Himalaya / Karakoram
  { name: "Kangchenjunga",     lat:  27.7025, lng:  88.1475, areaKm: 20 },
  { name: "Lhotse",            lat:  27.9617, lng:  86.9330, areaKm: 14 },
  { name: "Makalu",            lat:  27.8897, lng:  87.0883, areaKm: 15 },
  { name: "Cho Oyu",           lat:  28.0942, lng:  86.6608, areaKm: 13 },
  { name: "Dhaulagiri I",      lat:  28.6967, lng:  83.4875, areaKm: 18 },
  { name: "Manaslu",           lat:  28.5497, lng:  84.5597, areaKm: 16 },
  { name: "Nanga Parbat",      lat:  35.2372, lng:  74.5892, areaKm: 17 },
  { name: "Annapurna I",       lat:  28.5961, lng:  83.8203, areaKm: 17 },
  // Europe
  { name: "Ben Nevis",         lat:  56.7969, lng:  -5.0036, areaKm: 7 },
  { name: "Mount Olympus",     lat:  40.0850, lng:  22.3586, areaKm: 14 },
  { name: "Mount Etna",        lat:  37.7510, lng:  14.9934, areaKm: 35 },
  { name: "Mount Vesuvius",    lat:  40.8214, lng:  14.4265, areaKm: 16 },
  // North America
  { name: "Denali",            lat:  63.0695, lng:-151.0074, areaKm: 24 },
  { name: "Mount Rainier",     lat:  46.8523, lng:-121.7603, areaKm: 22 },
  { name: "Mount Whitney",     lat:  36.5786, lng:-118.2923, areaKm: 8 },
  // South America / Caribbean
  { name: "Aconcagua",         lat: -32.6532, lng: -70.0109, areaKm: 21 },
  { name: "Sugarloaf Mountain",lat: -22.9486, lng: -43.1566, areaKm: 4 },
  { name: "Pico Duarte",       lat:  19.0336, lng: -71.0031, areaKm: 12 },
  // Middle East
  { name: "Mount Sinai",       lat:  28.5392, lng:  33.9750, areaKm: 6 },
  // Oceania
  { name: "Mount Kosciuszko",  lat: -36.4558, lng: 148.2633, areaKm: 8 },
  { name: "Mount Taranaki",    lat: -39.2968, lng: 174.0632, areaKm: 18 },
  { name: "Mount Cook",        lat: -43.5950, lng: 170.1418, areaKm: 18 },
  // Antarctica
  { name: "Vinson Massif",     lat: -78.5255, lng: -85.6171, areaKm: 30 },
  // Cities — OSM building footprints sculpted onto the relief (buildings layer auto-on)
  { name: "Yerevan",       lat:  40.1776, lng:  44.5126, areaKm: 0.5, city: true },
  { name: "Manhattan",     lat:  40.7549, lng: -73.9840, areaKm: 0.5, city: true },
  { name: "Hong Kong",     lat:  22.2799, lng: 114.1588, areaKm: 0.5, city: true },
];

export const GRID = 150; // elevation samples per axis
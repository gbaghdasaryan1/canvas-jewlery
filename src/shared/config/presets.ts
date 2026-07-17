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
  // Cities — OSM building footprints sculpted onto the relief (buildings layer auto-on)
  { name: "Yerevan",       lat:  40.1776, lng:  44.5126, areaKm: 0.5, city: true },
  { name: "Manhattan",     lat:  40.7549, lng: -73.9840, areaKm: 0.5, city: true },
  { name: "Sevan",  lat:  40.384546, lng:  45.311667, areaKm: 2.5 },
  { name: "Hong Kong",     lat:  22.2799, lng: 114.1588, areaKm: 0.5, city: true },
];

export const GRID = 150; // elevation samples per axis
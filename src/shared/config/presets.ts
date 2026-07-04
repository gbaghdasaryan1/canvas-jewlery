export interface Preset {
  name: string;
  lat: number;
  lng: number;
  /** Optimal terrain window for this location (overrides the UI slider default). */
  areaKm?: number;
  /** City centres: turn the buildings layer on so the skyline is sculpted in. */
  city?: boolean;
}

/** Famous peaks and landforms — coordinates pinned to the exact summit or most dramatic point. */
export const PRESETS: Preset[] = [
  // Himalaya / Karakoram
  { name: "Everest",       lat:  27.9881, lng:  86.9250, areaKm: 6 },
  { name: "K2",            lat:  35.8808, lng:  76.5133, areaKm: 5 },
  // Europe
  { name: "Matterhorn",    lat:  45.9765, lng:   7.6587, areaKm: 2 },
  { name: "Mont Blanc",    lat:  45.8326, lng:   6.8652, areaKm: 4 },
  // Caucasus
  { name: "Mt Ararat",     lat:  39.7022, lng:  44.2998, areaKm: 6 },
  // Africa
  { name: "Kilimanjaro",   lat:  -3.0758, lng:  37.3533, areaKm: 5 },
  { name: "Table Mountain", lat: -33.9575, lng:  18.4028, areaKm: 3 },
  // Asia-Pacific
  { name: "Mt Fuji",       lat:  35.3607, lng: 138.7274, areaKm: 5 },
  // North America
  { name: "Grand Canyon",  lat:  36.2051, lng:-113.0545, areaKm: 4 },
  { name: "Half Dome",     lat:  37.7459, lng:-119.5332, areaKm: 2 },
  // Cities — skyline sculpted from building footprints (buildings layer auto-on)
  { name: "Manhattan",     lat:  40.7549, lng: -73.9840, areaKm: 2.5, city: true },
  { name: "Dubai Marina",  lat:  25.0805, lng:  55.1403, areaKm: 2.5, city: true },
  { name: "Hong Kong",     lat:  22.2799, lng: 114.1588, areaKm: 2.5, city: true },
  { name: "Yerevan",       lat:  40.1776, lng:  44.5126, areaKm: 2.5, city: true },
];

export const GRID = 55; // elevation samples per axis

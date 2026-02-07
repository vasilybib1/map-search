export interface CityConfig {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  zoom: number;
  bounds: { south: number; west: number; north: number; east: number };
  minZoom: number;
  maxZoom: number;
  graphFile: string;
  tilesFile: string;
}

export const cities: CityConfig[] = [
  {
    id: "vancouver",
    name: "Vancouver",
    center: { lat: 49.19, lng: -122.89 },
    zoom: 11,
    bounds: { south: 49.0, west: -123.28, north: 49.38, east: -122.5 },
    minZoom: 10,
    maxZoom: 20,
    graphFile: "vancouver-graph.json",
    tilesFile: "vancouver.pmtiles",
  },
];

export function getCityById(id: string): CityConfig | undefined {
  return cities.find((c) => c.id === id);
}

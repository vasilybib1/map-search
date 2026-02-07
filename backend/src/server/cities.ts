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
  {
    id: "toronto",
    name: "Toronto",
    center: { lat: 43.65, lng: -79.38 },
    zoom: 11,
    bounds: { south: 43.50, west: -79.75, north: 43.90, east: -79.00 },
    minZoom: 11,
    maxZoom: 20,
    graphFile: "toronto-graph.json",
    tilesFile: "toronto.pmtiles",
  },
];

export function getCityById(id: string): CityConfig | undefined {
  return cities.find((c) => c.id === id);
}

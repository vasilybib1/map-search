export interface CityConfig {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  zoom: number;
  graphFile: string;
  tilesFile: string;
}

export const cities: CityConfig[] = [
  {
    id: "vancouver",
    name: "Vancouver",
    center: { lat: 49.19, lng: -122.89 },
    zoom: 11,
    graphFile: "vancouver-graph.json",
    tilesFile: "vancouver.pmtiles",
  },
];

export function getCityById(id: string): CityConfig | undefined {
  return cities.find((c) => c.id === id);
}

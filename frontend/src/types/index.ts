export type CityId = "vancouver" | "toronto" | "new-york";
export type AlgorithmType = "astar" | "bfs" | "dfs";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface CityInfo {
  id: CityId;
  name: string;
  center: LatLng;
  zoom: number;
}

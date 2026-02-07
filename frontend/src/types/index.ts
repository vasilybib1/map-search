export type CityId = "vancouver" | "toronto" | "new-york";
export type AlgorithmType = "astar" | "bfs" | "dfs";
export type NodeId = string;
export type EdgeId = string;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface CityInfo {
  id: CityId;
  name: string;
  center: LatLng;
  zoom: number;
  bounds: Bounds;
  minZoom: number;
  maxZoom: number;
}

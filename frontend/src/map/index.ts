import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { buildDarkStyle } from "./style.js";
import type { LatLng, CityId, Bounds } from "../types/index.js";

function padBounds(b: Bounds, factor: number): Bounds {
  const latPad = (b.north - b.south) * factor;
  const lngPad = (b.east - b.west) * factor;
  return {
    south: b.south - latPad,
    north: b.north + latPad,
    west: b.west - lngPad,
    east: b.east + lngPad,
  };
}

let protocolRegistered = false;

function ensureProtocol(): void {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  protocolRegistered = true;
}

type MarkerRole = "origin" | "destination";

const MARKER_COLORS: Record<MarkerRole, { click: string; node: string }> = {
  origin:      { click: "#22d3ee", node: "#06b6d4" },
  destination: { click: "#f472b6", node: "#ec4899" },
};

const CLICK_RADIUS = 8;
const NODE_RADIUS = 6;

function emptyCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function pointFeature(pos: LatLng): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [pos.lng, pos.lat] },
        properties: {},
      },
    ],
  };
}

export class MapController {
  private map: maplibregl.Map | null = null;
  private shiftClickHandlers: Array<(point: LatLng) => void> = [];
  private explorationBatches: string[] = [];

  init(
    container: HTMLElement,
    center: LatLng,
    zoom: number,
    cityId: CityId,
    bounds: Bounds,
    minZoom: number,
    maxZoom: number,
  ): void {
    ensureProtocol();

    const tilesUrl = `/api/cities/${cityId}/tiles`;
    const style = buildDarkStyle(tilesUrl);
    const padded = padBounds(bounds, 0.5);

    this.map = new maplibregl.Map({
      container,
      style,
      center: [center.lng, center.lat],
      zoom,
      minZoom,
      maxZoom,
      maxBounds: [
        [padded.west, padded.south],
        [padded.east, padded.north],
      ],
      attributionControl: false,
      boxZoom: false,
    });

    this.map.on("click", (e) => {
      if (!e.originalEvent.shiftKey) return;
      const point: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      for (const handler of this.shiftClickHandlers) {
        handler(point);
      }
    });
  }

  private ensureMarkerLayer(role: MarkerRole): void {
    if (!this.map || !this.map.isStyleLoaded()) return;

    const colors = MARKER_COLORS[role];

    if (!this.map.getSource(`${role}-click`)) {
      this.map.addSource(`${role}-click`, { type: "geojson", data: emptyCollection() });
      this.map.addLayer({
        id: `${role}-click-layer`,
        type: "circle",
        source: `${role}-click`,
        paint: {
          "circle-radius": CLICK_RADIUS,
          "circle-color": colors.click,
          "circle-opacity": 0.5,
        },
      });
    }

    if (!this.map.getSource(`${role}-node`)) {
      this.map.addSource(`${role}-node`, { type: "geojson", data: emptyCollection() });
      this.map.addLayer({
        id: `${role}-node-layer`,
        type: "circle",
        source: `${role}-node`,
        paint: {
          "circle-radius": NODE_RADIUS,
          "circle-color": colors.node,
          "circle-opacity": 0.9,
        },
      });
    }
  }

  setMarker(role: MarkerRole, clickPos: LatLng | null, nodePos: LatLng | null): void {
    if (!this.map) return;

    this.ensureMarkerLayer(role);

    const clickSrc = this.map.getSource(`${role}-click`) as maplibregl.GeoJSONSource | undefined;
    const nodeSrc = this.map.getSource(`${role}-node`) as maplibregl.GeoJSONSource | undefined;

    clickSrc?.setData(clickPos ? pointFeature(clickPos) : emptyCollection());
    nodeSrc?.setData(nodePos ? pointFeature(nodePos) : emptyCollection());
  }

  clearMarkers(): void {
    this.setMarker("origin", null, null);
    this.setMarker("destination", null, null);
  }

  // --- Highlight layers for visualization ---

  private markerBeforeId(): string | undefined {
    if (!this.map) return undefined;
    return this.map.getLayer("origin-click-layer") ? "origin-click-layer" : undefined;
  }

  addExplorationBatch(features: GeoJSON.Feature[]): void {
    if (!this.map || features.length === 0) return;

    const id = `exploration-${this.explorationBatches.length}`;
    this.map.addSource(id, {
      type: "geojson",
      data: { type: "FeatureCollection", features },
    });
    this.map.addLayer({
      id: `${id}-layer`,
      type: "line",
      source: id,
      paint: {
        "line-color": "hsl(0, 0%, 45%)",
        "line-width": 2,
        "line-opacity": 0.8,
      },
    }, this.markerBeforeId());
    this.explorationBatches.push(id);
  }

  setPathEdges(features: GeoJSON.Feature[]): void {
    if (!this.map || features.length === 0) return;

    // Remove stale path layer/source if present
    if (this.map.getLayer("path-layer")) this.map.removeLayer("path-layer");
    if (this.map.getSource("path")) this.map.removeSource("path");

    this.map.addSource("path", {
      type: "geojson",
      data: { type: "FeatureCollection", features },
    });
    this.map.addLayer({
      id: "path-layer",
      type: "line",
      source: "path",
      paint: {
        "line-color": "#ffffff",
        "line-width": 4,
        "line-opacity": 1,
      },
    });
  }

  clearHighlights(): void {
    if (!this.map) return;

    for (const id of this.explorationBatches) {
      if (this.map.getLayer(`${id}-layer`)) this.map.removeLayer(`${id}-layer`);
      if (this.map.getSource(id)) this.map.removeSource(id);
    }
    this.explorationBatches = [];

    if (this.map.getLayer("path-layer")) this.map.removeLayer("path-layer");
    if (this.map.getSource("path")) this.map.removeSource("path");
  }

  onShiftClick(cb: (point: LatLng) => void): void {
    this.shiftClickHandlers.push(cb);
  }

  setCity(cityId: CityId, center: LatLng, zoom: number, bounds: Bounds, minZoom: number, maxZoom: number): void {
    if (!this.map) return;

    const tilesUrl = `/api/cities/${cityId}/tiles`;
    const style = buildDarkStyle(tilesUrl);
    this.map.setStyle(style);
    const padded = padBounds(bounds, 0.5);
    this.map.setMinZoom(minZoom);
    this.map.setMaxZoom(maxZoom);
    this.map.setMaxBounds([
      [padded.west, padded.south],
      [padded.east, padded.north],
    ]);
    this.map.setCenter([center.lng, center.lat]);
    this.map.setZoom(zoom);
  }

  onLoad(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.map) return resolve();
      if (this.map.loaded()) return resolve();
      this.map.once("load", () => resolve());
    });
  }

  onStyleLoad(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.map) return resolve();
      if (this.map.isStyleLoaded()) return resolve();
      this.map.once("idle", () => resolve());
    });
  }

}

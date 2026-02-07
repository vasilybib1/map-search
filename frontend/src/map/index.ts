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

function emptyPoint(): GeoJSON.FeatureCollection {
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
      this.map.addSource(`${role}-click`, { type: "geojson", data: emptyPoint() });
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
      this.map.addSource(`${role}-node`, { type: "geojson", data: emptyPoint() });
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

    clickSrc?.setData(clickPos ? pointFeature(clickPos) : emptyPoint());
    nodeSrc?.setData(nodePos ? pointFeature(nodePos) : emptyPoint());
  }

  clearMarkers(): void {
    this.setMarker("origin", null, null);
    this.setMarker("destination", null, null);
  }

  // --- Highlight layers for visualization ---

  private ensureHighlightLayers(): void {
    if (!this.map || !this.map.isStyleLoaded()) return;

    if (!this.map.getSource("exploration")) {
      this.map.addSource("exploration", { type: "geojson", data: emptyPoint() });
      // Insert below marker layers so markers stay on top
      const before = this.map.getLayer("origin-click-layer") ? "origin-click-layer" : undefined;
      this.map.addLayer({
        id: "exploration-layer",
        type: "line",
        source: "exploration",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 2,
          "line-opacity": 0.8,
        },
      }, before);
    }

    if (!this.map.getSource("path")) {
      this.map.addSource("path", { type: "geojson", data: emptyPoint() });
      const before = this.map.getLayer("origin-click-layer") ? "origin-click-layer" : undefined;
      this.map.addLayer({
        id: "path-layer",
        type: "line",
        source: "path",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 4,
          "line-opacity": 1,
        },
      }, before);
    }
  }

  setExplorationEdges(features: GeoJSON.Feature[]): void {
    if (!this.map) return;
    this.ensureHighlightLayers();
    const src = this.map.getSource("exploration") as maplibregl.GeoJSONSource | undefined;
    src?.setData({ type: "FeatureCollection", features });
  }

  setPathEdges(features: GeoJSON.Feature[]): void {
    if (!this.map) return;
    this.ensureHighlightLayers();
    const src = this.map.getSource("path") as maplibregl.GeoJSONSource | undefined;
    src?.setData({ type: "FeatureCollection", features });
  }

  clearHighlights(): void {
    this.setExplorationEdges([]);
    this.setPathEdges([]);
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

  getMap(): maplibregl.Map | null {
    return this.map;
  }

  destroy(): void {
    this.map?.remove();
    this.map = null;
    this.shiftClickHandlers = [];
  }
}

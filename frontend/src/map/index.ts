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

export class MapController {
  private map: maplibregl.Map | null = null;
  private clickHandlers: Array<(point: LatLng) => void> = [];

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
    });

    this.map.on("click", (e) => {
      const point: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      for (const handler of this.clickHandlers) {
        handler(point);
      }
    });
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

  onClick(cb: (point: LatLng) => void): void {
    this.clickHandlers.push(cb);
  }

  getMap(): maplibregl.Map | null {
    return this.map;
  }

  destroy(): void {
    this.map?.remove();
    this.map = null;
    this.clickHandlers = [];
  }
}

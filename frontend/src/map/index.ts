import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { buildDarkStyle } from "./style.js";
import type { LatLng, CityId } from "../types/index.js";

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

  init(container: HTMLElement, center: LatLng, zoom: number, cityId: CityId): void {
    ensureProtocol();

    const tilesUrl = `/api/cities/${cityId}/tiles`;
    const style = buildDarkStyle(tilesUrl);

    this.map = new maplibregl.Map({
      container,
      style,
      center: [center.lng, center.lat],
      zoom,
    });

    this.map.on("click", (e) => {
      const point: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      for (const handler of this.clickHandlers) {
        handler(point);
      }
    });
  }

  setCity(cityId: CityId, center: LatLng, zoom: number): void {
    if (!this.map) return;

    const tilesUrl = `/api/cities/${cityId}/tiles`;
    const style = buildDarkStyle(tilesUrl);
    this.map.setStyle(style);
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

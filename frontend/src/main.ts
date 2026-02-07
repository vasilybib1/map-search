import "maplibre-gl/dist/maplibre-gl.css";
import { MapController } from "./map/index.js";
import type { CityInfo } from "./types/index.js";

async function main(): Promise<void> {
  const res = await fetch("/api/cities");
  const cities: CityInfo[] = await res.json();

  if (cities.length === 0) {
    console.error("No cities available from backend");
    return;
  }

  const city = cities[0];
  const container = document.getElementById("map");
  if (!container) {
    console.error("Map container not found");
    return;
  }

  const mapController = new MapController();
  mapController.init(container, city.center, city.zoom, city.id, city.bounds, city.minZoom, city.maxZoom);
}

main();

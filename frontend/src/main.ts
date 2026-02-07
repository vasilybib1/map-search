import "maplibre-gl/dist/maplibre-gl.css";
import { MapController } from "./map/index.js";
import { fetchGraph, nearestNode } from "./graph/index.js";
import type { RoadGraph } from "./graph/index.js";
import type { CityInfo, LatLng } from "./types/index.js";

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

  const graph = await fetchGraph(city.id);
  console.log(`Graph loaded: ${graph.nodes.size} nodes, ${graph.edges.size} edges`);

  let origin: LatLng | null = null;
  let destination: LatLng | null = null;

  mapController.onShiftClick((point) => {
    handleShiftClick(point, graph, mapController);
  });

  function handleShiftClick(point: LatLng, g: RoadGraph, mc: MapController): void {
    const node = nearestNode(g, point);

    if (!origin) {
      origin = point;
      mc.setMarker("origin", point, node.position);
      console.log(`Origin set — click: (${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}) → nearest node: ${node.id} at (${node.position.lat.toFixed(5)}, ${node.position.lng.toFixed(5)})`);
    } else if (!destination) {
      destination = point;
      mc.setMarker("destination", point, node.position);
      console.log(`Destination set — click: (${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}) → nearest node: ${node.id} at (${node.position.lat.toFixed(5)}, ${node.position.lng.toFixed(5)})`);
    } else {
      origin = point;
      destination = null;
      mc.clearMarkers();
      const newNode = nearestNode(g, point);
      mc.setMarker("origin", point, newNode.position);
      console.log(`Reset — new origin: click: (${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}) → nearest node: ${newNode.id} at (${newNode.position.lat.toFixed(5)}, ${newNode.position.lng.toFixed(5)})`);
    }
  }
}

main();

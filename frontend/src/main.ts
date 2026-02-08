import "maplibre-gl/dist/maplibre-gl.css";
import "./ui/styles.css";
import { MapController } from "./map/index.js";
import { fetchGraph, nearestSnap } from "./graph/index.js";
import type { RoadGraph, GraphNode } from "./graph/index.js";
import { search } from "./algorithms/index.js";
import { Visualizer } from "./visualization/index.js";
import { ControlPanel } from "./ui/index.js";
import type { CityInfo, CityId, AlgorithmType, LatLng } from "./types/index.js";

async function main(): Promise<void> {
  const res = await fetch("/api/cities");
  const cities: CityInfo[] = await res.json();

  if (cities.length === 0) {
    console.error("No cities available from backend");
    return;
  }

  const container = document.getElementById("map");
  if (!container) {
    console.error("Map container not found");
    return;
  }

  // --- State ---
  let currentCity = cities[0];
  let currentAlgo: AlgorithmType = "astar";
  let graph: RoadGraph | null = null;
  let originNode: GraphNode | null = null;
  let destNode: GraphNode | null = null;
  let isRunning = false;

  // --- Map & Visualizer ---
  const visualizer = new Visualizer();
  const mapController = new MapController();
  mapController.init(
    container,
    currentCity.center,
    currentCity.zoom,
    currentCity.id,
    currentCity.bounds,
    currentCity.minZoom,
    currentCity.maxZoom,
  );

  // --- UI ---
  const panel = new ControlPanel(
    container,
    {
      cities: cities.map((c) => ({ id: c.id, name: c.name })),
      selectedCity: currentCity.id,
      selectedAlgo: currentAlgo,
      canStart: false,
      isRunning: false,
    },
    {
      onCityChange: handleCityChange,
      onAlgoChange: handleAlgoChange,
      onStart: handleStart,
      onReset: handleReset,
    },
  );

  // --- Loader helpers ---
  const loader = document.getElementById("loader")!;

  function showLoader(): void {
    loader.classList.remove("fade-out");
    loader.style.display = "flex";
  }

  function hideLoader(): void {
    loader.classList.add("fade-out");
  }

  // --- Wait for map + graph to load, then dismiss loader ---
  panel.setStatus("Loading...");
  const [loadedGraph] = await Promise.all([
    fetchGraph(currentCity.id),
    mapController.onLoad(),
  ]);
  graph = loadedGraph;

  hideLoader();
  panel.setStatus("Shift+click to place origin");

  // --- Handlers ---

  mapController.onShiftClick((point) => {
    if (!graph || isRunning) return;
    handlePointPlacement(point);
  });

  function handlePointPlacement(point: LatLng): void {
    if (!graph) return;
    const snap = nearestSnap(graph, point);

    if (!originNode) {
      originNode = snap.node;
      mapController.setMarker("origin", point, snap.node.position);
      panel.setStatus("Shift+click to place destination");
      panel.update({ canStart: false });
    } else if (!destNode) {
      destNode = snap.node;
      mapController.setMarker("destination", point, snap.node.position);
      panel.setStatus("Ready — press Start");
      panel.update({ canStart: true });
    } else {
      // Reset and set new origin
      visualizer.stop();
      originNode = snap.node;
      destNode = null;
      mapController.clearMarkers();
      mapController.clearHighlights();
      mapController.setMarker("origin", point, snap.node.position);
      panel.setStatus("Shift+click to place destination");
      panel.update({ canStart: false });
    }
  }

  async function handleCityChange(cityId: CityId): Promise<void> {
    const city = cities.find((c) => c.id === cityId);
    if (!city) return;

    visualizer.stop();
    currentCity = city;
    originNode = null;
    destNode = null;
    graph = null;

    showLoader();
    panel.setStatus("Loading...");
    panel.update({ canStart: false, isRunning: false });

    mapController.setCity(city.id, city.center, city.zoom, city.bounds, city.minZoom, city.maxZoom);

    const [loadedGraph] = await Promise.all([
      fetchGraph(city.id),
      mapController.onStyleLoad(),
    ]);
    graph = loadedGraph;

    hideLoader();
    panel.setStatus("Shift+click to place origin");
  }

  function handleAlgoChange(algo: AlgorithmType): void {
    currentAlgo = algo;
  }

  function handleStart(): void {
    if (!graph || !originNode || !destNode || isRunning) return;

    isRunning = true;
    panel.update({ isRunning: true });
    panel.setStatus(`Running ${currentAlgo.toUpperCase()}...`);
    mapController.clearHighlights();

    // Run algorithm (synchronous but may be heavy — use setTimeout to let UI update)
    setTimeout(() => {
      const result = search(graph!, originNode!.id, destNode!.id, currentAlgo);

      panel.setStatus(`Visualizing ${result.steps.length} steps...`);

      visualizer.start(result, graph!, mapController, () => {
        isRunning = false;
        panel.update({ isRunning: false, canStart: true });
        if (result.found) {
          panel.setStatus(`Done — ${result.steps.length} steps, path: ${result.path!.length} edges`);
        } else {
          panel.setStatus(`Done — no path found (${result.steps.length} steps explored)`);
        }
      });
    }, 50);
  }

  function handleReset(): void {
    visualizer.stop();
    originNode = null;
    destNode = null;
    isRunning = false;
    mapController.clearMarkers();
    mapController.clearHighlights();
    panel.update({ canStart: false, isRunning: false });
    panel.setStatus("Shift+click to place origin");
  }
}

main();

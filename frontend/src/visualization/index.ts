import type { RoadGraph, GraphEdge } from "../graph/index.js";
import type { SearchResult } from "../algorithms/index.js";
import type { EdgeId } from "../types/index.js";
import type { MapController } from "../map/index.js";

const EDGES_PER_FRAME = 300;
const HUE = 140; // green
const LIGHTNESS_START = 25; // dark green
const LIGHTNESS_END = 65; // light green

function edgeToFeature(edge: GraphEdge, color: string): GeoJSON.Feature {
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: edge.geometry.map((p) => [p.lng, p.lat]),
    },
    properties: { color },
  };
}

function stepColor(index: number, total: number): string {
  const t = total > 1 ? index / (total - 1) : 0;
  const lightness = LIGHTNESS_START + t * (LIGHTNESS_END - LIGHTNESS_START);
  return `hsl(${HUE}, 90%, ${Math.round(lightness)}%)`;
}

export class Visualizer {
  private animationId: number | null = null;

  start(
    result: SearchResult,
    graph: RoadGraph,
    map: MapController,
    onComplete?: () => void,
  ): void {
    this.stop();

    const { steps, path } = result;

    // Pre-compute all unique edge features with hue-based colors
    const allFeatures: GeoJSON.Feature[] = [];
    const seen = new Set<EdgeId>();

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (seen.has(step.edgeId)) continue;
      seen.add(step.edgeId);

      const edge = graph.edges.get(step.edgeId);
      if (!edge) continue;

      allFeatures.push(edgeToFeature(edge, stepColor(i, steps.length)));
    }

    const visible: GeoJSON.Feature[] = [];
    let cursor = 0;

    const tick = () => {
      const end = Math.min(cursor + EDGES_PER_FRAME, allFeatures.length);
      for (let i = cursor; i < end; i++) {
        visible.push(allFeatures[i]);
      }
      cursor = end;

      map.setExplorationEdges(visible);

      if (cursor < allFeatures.length) {
        this.animationId = requestAnimationFrame(tick);
      } else {
        // Draw final path
        if (path) {
          const pathFeatures = path
            .map((eid) => graph.edges.get(eid))
            .filter((e): e is GraphEdge => e != null)
            .map((e) => edgeToFeature(e, "#ffffff"));
          map.setPathEdges(pathFeatures);
        }
        this.animationId = null;
        onComplete?.();
      }
    };

    this.animationId = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

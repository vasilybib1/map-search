import type { RoadGraph, GraphEdge } from "../graph/index.js";
import type { SearchResult } from "../algorithms/index.js";
import type { EdgeId } from "../types/index.js";
import type { MapController } from "../map/index.js";

const EDGES_PER_FRAME = 500;
const BATCH_SIZE = 3000;
const EXPLORATION_COLOR = "hsl(0, 0%, 45%)";

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

    // Pre-compute all unique edge features with colors
    const allFeatures: GeoJSON.Feature[] = [];
    const seen = new Set<EdgeId>();

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (seen.has(step.edgeId)) continue;
      seen.add(step.edgeId);

      const edge = graph.edges.get(step.edgeId);
      if (!edge) continue;

      allFeatures.push(edgeToFeature(edge, EXPLORATION_COLOR));
    }

    let cursor = 0;
    let batch: GeoJSON.Feature[] = [];

    const tick = () => {
      const end = Math.min(cursor + EDGES_PER_FRAME, allFeatures.length);
      for (let i = cursor; i < end; i++) {
        batch.push(allFeatures[i]);
      }
      cursor = end;

      // Flush batch when it hits threshold or we're done
      if (batch.length >= BATCH_SIZE || cursor >= allFeatures.length) {
        map.addExplorationBatch(batch);
        batch = [];
      }

      if (cursor < allFeatures.length) {
        this.animationId = requestAnimationFrame(tick);
      } else {
        // Delay path by one frame so MapLibre finishes the last exploration batch
        this.animationId = requestAnimationFrame(() => {
          if (path && path.length > 0) {
            const pathFeatures = path
              .map((eid) => graph.edges.get(eid))
              .filter((e): e is GraphEdge => e != null)
              .map((e) => edgeToFeature(e, "#ffffff"));
            map.setPathEdges(pathFeatures);
          }
          this.animationId = null;
          onComplete?.();
        });
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

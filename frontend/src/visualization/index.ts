import type { RoadGraph, GraphEdge } from "../graph/index.js";
import type { SearchResult } from "../algorithms/index.js";
import type { MapController } from "../map/index.js";

const EDGES_PER_FRAME = 500;
const BATCH_SIZE = 3000;

function edgeToLineFeature(edge: GraphEdge): GeoJSON.Feature {
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: edge.geometry.map((p) => [p.lng, p.lat]),
    },
    properties: {},
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

    // Pre-compute all unique edge features
    const allFeatures: GeoJSON.Feature[] = [];
    const seen = new Set<string>();

    for (const step of steps) {
      if (seen.has(step.edgeId)) continue;
      seen.add(step.edgeId);

      const edge = graph.edges.get(step.edgeId);
      if (!edge) continue;

      allFeatures.push(edgeToLineFeature(edge));
    }

    let cursor = 0;
    let batch: GeoJSON.Feature[] = [];

    const tick = () => {
      const end = Math.min(cursor + EDGES_PER_FRAME, allFeatures.length);
      for (let i = cursor; i < end; i++) {
        batch.push(allFeatures[i]);
      }
      cursor = end;

      if (batch.length >= BATCH_SIZE || cursor >= allFeatures.length) {
        map.addExplorationBatch(batch);
        batch = [];
      }

      if (cursor < allFeatures.length) {
        this.animationId = requestAnimationFrame(tick);
      } else {
        this.animationId = requestAnimationFrame(() => {
          if (path && path.length > 0) {
            const pathFeatures = path
              .map((eid) => graph.edges.get(eid))
              .filter((e): e is GraphEdge => e != null)
              .map((e) => edgeToLineFeature(e));
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

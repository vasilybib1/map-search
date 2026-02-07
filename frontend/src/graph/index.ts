import type { LatLng, NodeId, EdgeId } from "../types/index.js";

export interface GraphNode {
  id: NodeId;
  position: LatLng;
  neighbors: EdgeId[];
}

export interface GraphEdge {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
  weight: number;
  geometry: LatLng[];
}

export interface RoadGraph {
  nodes: Map<NodeId, GraphNode>;
  edges: Map<EdgeId, GraphEdge>;
}

interface RawGraph {
  nodes: Record<string, GraphNode>;
  edges: Record<string, GraphEdge>;
}

export function parseGraph(raw: unknown): RoadGraph {
  const data = raw as RawGraph;
  const nodes = new Map<NodeId, GraphNode>(Object.entries(data.nodes));
  const edges = new Map<EdgeId, GraphEdge>(Object.entries(data.edges));
  return { nodes, edges };
}

export function nearestNode(graph: RoadGraph, point: LatLng): GraphNode {
  let best: GraphNode | null = null;
  let bestDist = Infinity;

  for (const node of graph.nodes.values()) {
    const d = distSq(point, node.position);
    if (d < bestDist) {
      bestDist = d;
      best = node;
    }
  }

  if (!best) throw new Error("Graph has no nodes");
  return best;
}

function distSq(a: LatLng, b: LatLng): number {
  const dlat = a.lat - b.lat;
  const dlng = a.lng - b.lng;
  return dlat * dlat + dlng * dlng;
}

export async function fetchGraph(cityId: string): Promise<RoadGraph> {
  const res = await fetch(`/api/cities/${cityId}/graph`);
  const raw: unknown = await res.json();
  return parseGraph(raw);
}

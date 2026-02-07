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

export interface SnapResult {
  node: GraphNode;
  edge: GraphEdge;
  projected: LatLng;
}

export function nearestSnap(graph: RoadGraph, point: LatLng): SnapResult {
  let bestDist = Infinity;
  let bestProjected: LatLng = point;
  let bestEdge: GraphEdge | null = null;

  for (const edge of graph.edges.values()) {
    const geom = edge.geometry;
    for (let i = 0; i < geom.length - 1; i++) {
      const proj = projectOntoSegment(point, geom[i], geom[i + 1]);
      const d = distSq(point, proj);
      if (d < bestDist) {
        bestDist = d;
        bestProjected = proj;
        bestEdge = edge;
      }
    }
  }

  if (!bestEdge) throw new Error("Graph has no edges");

  const fromNode = graph.nodes.get(bestEdge.from)!;
  const toNode = graph.nodes.get(bestEdge.to)!;
  const dFrom = distSq(bestProjected, fromNode.position);
  const dTo = distSq(bestProjected, toNode.position);
  const node = dFrom <= dTo ? fromNode : toNode;

  return { node, edge: bestEdge, projected: bestProjected };
}

export function nearestNode(graph: RoadGraph, point: LatLng): GraphNode {
  return nearestSnap(graph, point).node;
}

function projectOntoSegment(p: LatLng, a: LatLng, b: LatLng): LatLng {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return a;

  let t = ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return { lat: a.lat + t * dy, lng: a.lng + t * dx };
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

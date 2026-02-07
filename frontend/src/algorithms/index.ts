import type { NodeId, EdgeId, AlgorithmType } from "../types/index.js";
import type { RoadGraph } from "../graph/index.js";

export interface SearchStep {
  type: "visit" | "backtrack";
  edgeId: EdgeId;
  nodeId: NodeId;
}

export interface SearchResult {
  steps: SearchStep[];
  path: EdgeId[] | null;
  found: boolean;
}

export function search(
  graph: RoadGraph,
  start: NodeId,
  goal: NodeId,
  algorithm: AlgorithmType,
): SearchResult {
  switch (algorithm) {
    case "bfs":
      return bfs(graph, start, goal);
    case "dfs":
      return dfs(graph, start, goal);
    case "astar":
      return astar(graph, start, goal);
  }
}

function reconstructPath(
  cameFrom: Map<NodeId, { node: NodeId; edge: EdgeId }>,
  goal: NodeId,
): EdgeId[] {
  const path: EdgeId[] = [];
  let current = goal;
  while (cameFrom.has(current)) {
    const prev = cameFrom.get(current)!;
    path.push(prev.edge);
    current = prev.node;
  }
  path.reverse();
  return path;
}

// ---------- BFS ----------

function bfs(graph: RoadGraph, start: NodeId, goal: NodeId): SearchResult {
  const steps: SearchStep[] = [];
  const visited = new Set<NodeId>();
  const cameFrom = new Map<NodeId, { node: NodeId; edge: EdgeId }>();
  const queue: NodeId[] = [start];
  visited.add(start);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === goal) {
      return { steps, path: reconstructPath(cameFrom, goal), found: true };
    }

    const node = graph.nodes.get(current);
    if (!node) continue;

    for (const edgeId of node.neighbors) {
      const edge = graph.edges.get(edgeId);
      if (!edge) continue;

      const neighbor = edge.to;
      if (visited.has(neighbor)) continue;

      visited.add(neighbor);
      cameFrom.set(neighbor, { node: current, edge: edgeId });
      steps.push({ type: "visit", edgeId, nodeId: neighbor });
      queue.push(neighbor);
    }
  }

  return { steps, path: null, found: false };
}

// ---------- DFS ----------

function dfs(graph: RoadGraph, start: NodeId, goal: NodeId): SearchResult {
  const steps: SearchStep[] = [];
  const visited = new Set<NodeId>();
  const cameFrom = new Map<NodeId, { node: NodeId; edge: EdgeId }>();
  const stack: NodeId[] = [start];

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === goal) {
      return { steps, path: reconstructPath(cameFrom, goal), found: true };
    }

    const node = graph.nodes.get(current);
    if (!node) continue;

    for (const edgeId of node.neighbors) {
      const edge = graph.edges.get(edgeId);
      if (!edge) continue;

      const neighbor = edge.to;
      if (visited.has(neighbor)) continue;

      cameFrom.set(neighbor, { node: current, edge: edgeId });
      steps.push({ type: "visit", edgeId, nodeId: neighbor });
      stack.push(neighbor);
    }
  }

  return { steps, path: null, found: false };
}

// ---------- A* ----------

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = Math.PI / 180;
  const dlat = (b.lat - a.lat) * toRad;
  const dlng = (b.lng - a.lng) * toRad;
  const sinLat = Math.sin(dlat / 2);
  const sinLng = Math.sin(dlng / 2);
  const h = sinLat * sinLat + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function astar(graph: RoadGraph, start: NodeId, goal: NodeId): SearchResult {
  const steps: SearchStep[] = [];
  const goalNode = graph.nodes.get(goal);
  if (!goalNode) return { steps, path: null, found: false };

  const gScore = new Map<NodeId, number>();
  const fScore = new Map<NodeId, number>();
  const cameFrom = new Map<NodeId, { node: NodeId; edge: EdgeId }>();
  const closed = new Set<NodeId>();

  gScore.set(start, 0);
  const startNode = graph.nodes.get(start);
  if (!startNode) return { steps, path: null, found: false };
  fScore.set(start, haversineMeters(startNode.position, goalNode.position));

  // Simple binary heap for the open set
  const open: NodeId[] = [start];

  function fVal(id: NodeId): number {
    return fScore.get(id) ?? Infinity;
  }

  function heapPush(id: NodeId): void {
    open.push(id);
    let i = open.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (fVal(open[parent]) <= fVal(open[i])) break;
      [open[parent], open[i]] = [open[i], open[parent]];
      i = parent;
    }
  }

  function heapPop(): NodeId {
    const top = open[0];
    const last = open.pop()!;
    if (open.length > 0) {
      open[0] = last;
      let i = 0;
      while (true) {
        let smallest = i;
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        if (l < open.length && fVal(open[l]) < fVal(open[smallest])) smallest = l;
        if (r < open.length && fVal(open[r]) < fVal(open[smallest])) smallest = r;
        if (smallest === i) break;
        [open[smallest], open[i]] = [open[i], open[smallest]];
        i = smallest;
      }
    }
    return top;
  }

  while (open.length > 0) {
    const current = heapPop();

    if (current === goal) {
      return { steps, path: reconstructPath(cameFrom, goal), found: true };
    }

    if (closed.has(current)) continue;
    closed.add(current);

    const node = graph.nodes.get(current);
    if (!node) continue;

    for (const edgeId of node.neighbors) {
      const edge = graph.edges.get(edgeId);
      if (!edge) continue;

      const neighbor = edge.to;
      if (closed.has(neighbor)) continue;

      const tentativeG = (gScore.get(current) ?? Infinity) + edge.weight;
      if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
        cameFrom.set(neighbor, { node: current, edge: edgeId });
        gScore.set(neighbor, tentativeG);

        const neighborNode = graph.nodes.get(neighbor);
        const h = neighborNode ? haversineMeters(neighborNode.position, goalNode.position) : 0;
        fScore.set(neighbor, tentativeG + h);

        steps.push({ type: "visit", edgeId, nodeId: neighbor });
        heapPush(neighbor);
      }
    }
  }

  return { steps, path: null, found: false };
}

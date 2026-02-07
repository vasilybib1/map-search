# map-search — Architecture Plan

## Directory Structure

```
map-search/
├── frontend/
│   ├── src/
│   │   ├── app/              # Entry point, top-level state, orchestration
│   │   ├── map/              # Map rendering & interaction (MapLibre GL)
│   │   ├── graph/            # Road network graph representation
│   │   ├── algorithms/       # A*, BFS, DFS implementations
│   │   ├── visualization/    # Step-by-step algorithm animation on map
│   │   ├── ui/               # Floating control panel components
│   │   └── types/            # Shared TypeScript types & constants
│   ├── index.html
│   ├── tsconfig.json
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── server/           # HTTP server & routes
│   │   └── data/             # Pre-stored graph data per city
│   ├── tsconfig.json
│   └── package.json
└── SPEC.md
```

## Core Modules & Responsibilities

### 1. `types` — Shared Type Definitions
Single source of truth for all domain types used across modules.

### 2. `graph` — Road Network Graph
Defines the graph data structure (nodes = intersections, edges = road segments). Responsible for deserializing graph data from the backend and providing spatial lookups (e.g. "nearest node to this lat/lng click").

### 3. `algorithms` — Pathfinding Engines
Implements A*, BFS, and DFS over the road graph. Each algorithm produces a **trace** — an ordered list of exploration steps — so visualization can replay the search. Algorithms are pure functions with no UI or map dependency.

### 4. `map` — Map Renderer
Wraps MapLibre GL JS. Renders the dark-themed basemap tiles, handles zoom/pan, draws origin/destination markers, and draws highlighted road segments (explored edges, final path). Exposes click events for point placement.

### 5. `visualization` — Animation Controller
Takes a search trace and animates it on the map step-by-step. Manages playback timing (frame-by-frame edge highlighting). Has no knowledge of algorithms — it only consumes `SearchStep[]`.

### 6. `ui` — Control Panel
The floating overlay with three controls: city selector dropdown, algorithm selector, and a start/reset button. Purely presentational — delegates all actions upward via callbacks.

### 7. `app` — Orchestrator
Top-level application state machine. Wires all modules together: loads graph when city changes, captures clicks for point placement, kicks off algorithm runs, feeds results to the visualizer. Owns the state transitions (idle → points selected → running → complete).

### 8. `backend/server` — Map Data API
Minimal HTTP server. Serves pre-computed road-network graph JSON for each supported city. No auth, no database — just static file serving with a thin route layer.

## Public Interfaces Between Modules

### `types`
```
LatLng          { lat: number; lng: number }
NodeId          string
EdgeId          string
CityId          'new-york' | 'vancouver' | 'toronto'
AlgorithmType   'astar' | 'bfs' | 'dfs'
```

### `graph`
```
GraphNode       { id: NodeId; position: LatLng; neighbors: EdgeId[] }
GraphEdge       { id: EdgeId; from: NodeId; to: NodeId; weight: number; geometry: LatLng[] }
RoadGraph       { nodes: Map<NodeId, GraphNode>; edges: Map<EdgeId, GraphEdge> }

parseGraph(raw: unknown): RoadGraph
nearestNode(graph: RoadGraph, point: LatLng): GraphNode
```
- **Consumed by:** `algorithms`, `map`, `app`

### `algorithms`
```
SearchStep      { type: 'visit' | 'backtrack'; edgeId: EdgeId; nodeId: NodeId }
SearchResult    { steps: SearchStep[]; path: EdgeId[] | null; found: boolean }

search(graph: RoadGraph, start: NodeId, goal: NodeId, algorithm: AlgorithmType): SearchResult
```
- **Depends on:** `graph` (reads `RoadGraph`)
- **Consumed by:** `app`, `visualization`

### `map`
```
MapController
  .init(container: HTMLElement, center: LatLng, zoom: number): void
  .setCity(cityId: CityId): void
  .onClick(cb: (point: LatLng) => void): void
  .setMarker(role: 'origin' | 'destination', point: LatLng | null): void
  .highlightEdges(edgeGeometries: LatLng[][], color: string): void
  .highlightPath(edgeGeometries: LatLng[][], color: string): void
  .clearHighlights(): void
  .destroy(): void
```
- **Consumed by:** `app`, `visualization`

### `visualization`
```
Visualizer
  .start(steps: SearchStep[], graph: RoadGraph, map: MapController): void
  .stop(): void
  .onComplete(cb: () => void): void
```
- **Depends on:** `map` (calls `highlightEdges`), `graph` (resolves edge geometries)
- **Consumed by:** `app`

### `ui`
```
ControlPanel (component)
  Props:
    cities:           CityId[]
    selectedCity:     CityId
    selectedAlgo:     AlgorithmType
    canStart:         boolean      // true when both points placed
    isRunning:        boolean

  Callbacks:
    onCityChange:     (city: CityId) => void
    onAlgoChange:     (algo: AlgorithmType) => void
    onStart:          () => void
    onReset:          () => void
```
- **Consumed by:** `app`

### `app`
```
App (root component / entry)
  - Holds state: currentCity, currentAlgo, origin, destination, phase
  - On city change → fetches graph from backend, resets points
  - On map click → sets origin (first click) or destination (second click)
  - On start → runs search(), passes result to Visualizer.start()
  - On reset → clears highlights, markers, and state
```

### `backend/server`
```
GET  /api/cities                → CityId[]
GET  /api/cities/:id/graph      → { nodes: GraphNode[]; edges: GraphEdge[] }
```
- **Consumed by:** `app` (via fetch at runtime)

## Data Flow Summary

```
User clicks city  →  app  →  backend (fetch graph)  →  graph.parseGraph()
User clicks map   →  map.onClick  →  app  →  graph.nearestNode()  →  map.setMarker()
User clicks start →  app  →  algorithms.search()  →  visualization.start()  →  map.highlightEdges()
```

### Key Design Decisions
- **Algorithms are pure** — no DOM, no map, no async. They return a complete trace synchronously, making them testable in isolation.
- **Visualization is decoupled from algorithms** — it only consumes `SearchStep[]`, so adding a new algorithm requires zero changes to the visualizer.
- **Backend is minimal** — serves static pre-computed graph JSON. The heavy lifting (pathfinding, rendering) happens client-side per the spec's constraint.

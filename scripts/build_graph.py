"""
Download the Vancouver greater area road network via OSMnx
and export it as a JSON graph for the frontend pathfinding algorithms.

Output format (matches PLAN.md graph interfaces):
{
  "nodes": {
    "<nodeId>": { "id": "<nodeId>", "position": { "lat": ..., "lng": ... }, "neighbors": ["<edgeId>", ...] }
  },
  "edges": {
    "<edgeId>": { "id": "<edgeId>", "from": "<nodeId>", "to": "<nodeId>", "weight": <meters>, "geometry": [{"lat": ..., "lng": ...}, ...] }
  }
}
"""

import json
import os
import sys
import osmnx as ox

# Vancouver greater area bounding box (matches the PMTiles extract)
BBOX_NORTH = 49.38
BBOX_SOUTH = 49.00
BBOX_EAST = -122.50
BBOX_WEST = -123.28

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "backend", "src", "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "vancouver-graph.json")


def main():
    print("Downloading Vancouver road network from OSM...")
    # OSMnx v2 bbox order: (west, south, east, north)
    G = ox.graph_from_bbox(
        bbox=(BBOX_WEST, BBOX_SOUTH, BBOX_EAST, BBOX_NORTH),
        network_type="drive",
        simplify=True,
    )

    print(f"Raw graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    # OSMnx already computes edge lengths (in meters) during simplification.
    # Just ensure all edges have a length attribute via great-circle distance.
    G = ox.distance.add_edge_lengths(G)

    nodes = {}
    edges = {}

    # Build edge records first so we can attach edge IDs to neighbor lists
    for u, v, key, data in G.edges(keys=True, data=True):
        edge_id = f"{u}-{v}-{key}"
        weight = data.get("length", 0.0)  # meters

        # Edge geometry: use the 'geometry' linestring if available, else straight line
        if "geometry" in data:
            coords = list(data["geometry"].coords)
            geometry = [{"lat": round(c[1], 6), "lng": round(c[0], 6)} for c in coords]
        else:
            from_node = G.nodes[u]
            to_node = G.nodes[v]
            geometry = [
                {"lat": round(from_node["y"], 6), "lng": round(from_node["x"], 6)},
                {"lat": round(to_node["y"], 6), "lng": round(to_node["x"], 6)},
            ]

        edges[edge_id] = {
            "id": edge_id,
            "from": str(u),
            "to": str(v),
            "weight": round(weight, 2),
            "geometry": geometry,
        }

    # Build node records
    for node_id, data in G.nodes(data=True):
        neighbor_edge_ids = []
        for u, v, key in G.out_edges(node_id, keys=True):
            neighbor_edge_ids.append(f"{u}-{v}-{key}")

        nodes[str(node_id)] = {
            "id": str(node_id),
            "position": {
                "lat": round(data["y"], 6),
                "lng": round(data["x"], 6),
            },
            "neighbors": neighbor_edge_ids,
        }

    graph_data = {"nodes": nodes, "edges": edges}

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(graph_data, f)

    file_size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    print(f"Wrote {OUTPUT_FILE}")
    print(f"  {len(nodes)} nodes, {len(edges)} edges, {file_size_mb:.1f} MB")


if __name__ == "__main__":
    main()

"""
Download road networks via OSMnx and export as JSON graphs
for the frontend pathfinding algorithms.

Usage:
    python build_graph.py vancouver
    python build_graph.py toronto
    python build_graph.py all

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

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "backend", "src", "data")

CITIES = {
    "vancouver": {
        "name": "Vancouver",
        "bbox_north": 49.38,
        "bbox_south": 49.00,
        "bbox_east": -122.50,
        "bbox_west": -123.28,
    },
    "toronto": {
        "name": "Toronto",
        "bbox_north": 43.85,
        "bbox_south": 43.55,
        "bbox_east": -79.10,
        "bbox_west": -79.65,
    },
}


def build_graph(city_id: str):
    cfg = CITIES[city_id]
    output_file = os.path.join(OUTPUT_DIR, f"{city_id}-graph.json")

    print(f"Downloading {cfg['name']} road network from OSM...")
    G = ox.graph_from_bbox(
        bbox=(cfg["bbox_west"], cfg["bbox_south"], cfg["bbox_east"], cfg["bbox_north"]),
        network_type="all",
        simplify=True,
        retain_all=True,
    )

    print(f"Raw graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
    G = ox.distance.add_edge_lengths(G)

    nodes = {}
    edges = {}

    for u, v, key, data in G.edges(keys=True, data=True):
        edge_id = f"{u}-{v}-{key}"
        weight = data.get("length", 0.0)

        if "geometry" in data:
            coords = list(data["geometry"].coords)
            geometry = [{"lat": round(c[1], 5), "lng": round(c[0], 5)} for c in coords]
        else:
            from_node = G.nodes[u]
            to_node = G.nodes[v]
            geometry = [
                {"lat": round(from_node["y"], 5), "lng": round(from_node["x"], 5)},
                {"lat": round(to_node["y"], 5), "lng": round(to_node["x"], 5)},
            ]

        edges[edge_id] = {
            "id": edge_id,
            "from": str(u),
            "to": str(v),
            "weight": round(weight, 2),
            "geometry": geometry,
        }

    for node_id, data in G.nodes(data=True):
        neighbor_edge_ids = []
        for u, v, key in G.out_edges(node_id, keys=True):
            neighbor_edge_ids.append(f"{u}-{v}-{key}")

        nodes[str(node_id)] = {
            "id": str(node_id),
            "position": {
                "lat": round(data["y"], 5),
                "lng": round(data["x"], 5),
            },
            "neighbors": neighbor_edge_ids,
        }

    graph_data = {"nodes": nodes, "edges": edges}

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(output_file, "w") as f:
        json.dump(graph_data, f)

    file_size_mb = os.path.getsize(output_file) / (1024 * 1024)
    print(f"Wrote {output_file}")
    print(f"  {len(nodes)} nodes, {len(edges)} edges, {file_size_mb:.1f} MB")


def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "all"

    if target == "all":
        for city_id in CITIES:
            build_graph(city_id)
    elif target in CITIES:
        build_graph(target)
    else:
        print(f"Unknown city: {target}. Available: {', '.join(CITIES.keys())}, all")
        sys.exit(1)


if __name__ == "__main__":
    main()

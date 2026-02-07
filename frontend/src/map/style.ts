import type { StyleSpecification } from "maplibre-gl";
import { layers, DARK } from "@protomaps/basemaps";

const SOURCE_NAME = "protomaps";

export function buildDarkStyle(tilesUrl: string): StyleSpecification {
  return {
    version: 8,
    glyphs:
      "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
    sources: {
      [SOURCE_NAME]: {
        type: "vector",
        url: `pmtiles://${tilesUrl}`,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    },
    layers: layers(SOURCE_NAME, DARK),
  };
}

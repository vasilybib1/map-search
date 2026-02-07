import { Router } from "express";
import path from "node:path";
import { createReadStream, statSync } from "node:fs";
import { cities, getCityById } from "./cities.js";

const DATA_DIR = path.resolve(import.meta.dirname, "../data");

const router = Router();

// GET /api/cities — list all available cities
router.get("/cities", (_req, res) => {
  const list = cities.map(({ id, name, center, zoom, bounds, minZoom, maxZoom }) => ({
    id,
    name,
    center,
    zoom,
    bounds,
    minZoom,
    maxZoom,
  }));
  res.json(list);
});

// GET /api/cities/:id/graph — stream graph JSON
router.get("/cities/:id/graph", (req, res) => {
  const city = getCityById(req.params.id);
  if (!city) {
    res.status(404).json({ error: "City not found" });
    return;
  }

  const filePath = path.join(DATA_DIR, city.graphFile);
  res.setHeader("Content-Type", "application/json");
  createReadStream(filePath).pipe(res);
});

// GET /api/cities/:id/tiles — serve PMTiles with range-request support
router.get("/cities/:id/tiles", (req, res) => {
  const city = getCityById(req.params.id);
  if (!city) {
    res.status(404).json({ error: "City not found" });
    return;
  }

  const filePath = path.join(DATA_DIR, city.tilesFile);

  let stat;
  try {
    stat = statSync(filePath);
  } catch {
    res.status(404).json({ error: "Tiles file not found" });
    return;
  }

  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "application/octet-stream",
    });
    createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Accept-Ranges": "bytes",
      "Content-Type": "application/octet-stream",
    });
    createReadStream(filePath).pipe(res);
  }
});

export default router;

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT || 8766);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
  const urlPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const filePath = path.join(__dirname, urlPath);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
const players = new Map();

function broadcast(payload) {
  const encoded = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(encoded);
  }
}

function snapshotPlayers() {
  return Array.from(players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    x: p.x,
    y: p.y,
    z: p.z,
    ry: p.ry,
    hp: p.hp,
    zone: p.zone,
    level: p.level,
    wing: p.wing,
    flare: p.flare,
    color: p.color
  }));
}

wss.on("connection", (ws) => {
  const id = `p_${Math.random().toString(36).slice(2, 10)}`;
  const player = {
    id,
    name: `Daeva-${id.slice(-4)}`,
    x: 0, y: 0, z: 0, ry: 0,
    hp: 200,
    zone: "field",
    level: 1,
    wing: 0,
    flare: 0,
    color: Math.floor(Math.random() * 0xffffff)
  };
  players.set(id, player);
  ws.send(JSON.stringify({ type: "welcome", id, players: snapshotPlayers() }));
  broadcast({ type: "players", players: snapshotPlayers() });

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    const current = players.get(id);
    if (!current) return;
    if (msg.type === "update") {
      current.name = typeof msg.name === "string" ? msg.name.slice(0, 24) : current.name;
      current.x = Number(msg.x) || 0;
      current.y = Number(msg.y) || 0;
      current.z = Number(msg.z) || 0;
      current.ry = Number(msg.ry) || 0;
      current.hp = Number(msg.hp) || current.hp;
      current.zone = msg.zone === "dungeon" ? "dungeon" : "field";
      current.level = Number(msg.level) || 1;
      current.wing = Number(msg.wing) || 0;
      current.flare = Number(msg.flare) || 0;
    }
  });

  ws.on("close", () => {
    players.delete(id);
    broadcast({ type: "players", players: snapshotPlayers() });
  });
});

setInterval(() => {
  broadcast({ type: "players", players: snapshotPlayers() });
}, 100);

server.listen(port, () => {
  console.log(`Hourglass Hollow MMO server listening on http://localhost:${port}`);
});

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, game: "Last Signal Online" }));

const players = new Map();
let enemies = [];
let shots = [];
let wave = 1;
let nextEnemyId = 1;
let lastSpawn = 0;
let worldTime = 0;

const ARENA = { width: 1800, height: 1100 };
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (min, max) => Math.random() * (max - min) + min;

function publicPlayer(p) {
  return { id: p.id, name: p.name, x: p.x, y: p.y, angle: p.angle, hp: p.hp, color: p.color, score: p.score };
}

io.on("connection", socket => {
  socket.on("join", rawName => {
    const name = String(rawName || "Ranger").replace(/[<>]/g, "").trim().slice(0, 16) || "Ranger";
    const colors = ["#6ee7d2", "#ffd166", "#c4a7ff", "#ff9f9f", "#9ed0ff", "#c5ee8a"];
    const p = {
      id: socket.id, name, x: rand(180, ARENA.width - 180), y: rand(180, ARENA.height - 180),
      angle: 0, hp: 100, color: colors[players.size % colors.length], score: 0,
      input: { up: false, down: false, left: false, right: false }, lastShot: 0
    };
    players.set(socket.id, p);
    socket.emit("joined", { id: socket.id, arena: ARENA, wave });
    io.emit("feed", `${name} joined the resistance.`);
    io.emit("snapshot", makeSnapshot());
  });

  socket.on("input", data => {
    const p = players.get(socket.id);
    if (!p || !data || typeof data !== "object") return;
    p.input = {
      up: !!data.up, down: !!data.down, left: !!data.left, right: !!data.right
    };
    if (Number.isFinite(data.angle)) p.angle = data.angle;
    if (data.shoot && Date.now() - p.lastShot > 260) {
      p.lastShot = Date.now();
      const speed = 570;
      shots.push({
        id: `${socket.id}-${Date.now()}-${Math.random()}`,
        owner: socket.id, x: p.x + Math.cos(p.angle) * 25, y: p.y + Math.sin(p.angle) * 25,
        vx: Math.cos(p.angle) * speed, vy: Math.sin(p.angle) * speed, life: 1.15
      });
    }
  });

  socket.on("chat", raw => {
    const p = players.get(socket.id);
    if (!p) return;
    const message = String(raw || "").replace(/[<>]/g, "").trim().slice(0, 100);
    if (message) io.emit("chat", { name: p.name, message });
  });

  socket.on("disconnect", () => {
    const p = players.get(socket.id);
    if (p) io.emit("feed", `${p.name} left the resistance.`);
    players.delete(socket.id);
    io.emit("snapshot", makeSnapshot());
  });
});

function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);
  let x = edge === 0 ? 20 : edge === 1 ? ARENA.width - 20 : rand(20, ARENA.width - 20);
  let y = edge === 2 ? 20 : edge === 3 ? ARENA.height - 20 : rand(20, ARENA.height - 20);
  enemies.push({
    id: nextEnemyId++, x, y, hp: 2 + Math.min(3, Math.floor(wave / 3)),
    speed: 48 + Math.min(34, wave * 2.2), radius: 19 + Math.min(5, wave), hit: 0
  });
}

function makeSnapshot() {
  return {
    players: [...players.values()].map(publicPlayer),
    enemies, shots, wave, arena: ARENA,
    remaining: enemies.length
  };
}

let previous = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = Math.min(0.05, (now - previous) / 1000);
  previous = now;
  worldTime += dt;

  for (const p of players.values()) {
    const speed = 235;
    let dx = (p.input.right ? 1 : 0) - (p.input.left ? 1 : 0);
    let dy = (p.input.down ? 1 : 0) - (p.input.up ? 1 : 0);
    const mag = Math.hypot(dx, dy) || 1;
    p.x = clamp(p.x + dx / mag * speed * dt, 25, ARENA.width - 25);
    p.y = clamp(p.y + dy / mag * speed * dt, 25, ARENA.height - 25);
  }

  if (players.size && now - lastSpawn > Math.max(500, 1750 - wave * 65)) {
    spawnEnemy();
    lastSpawn = now;
  }

  for (const e of enemies) {
    let target = null, best = Infinity;
    for (const p of players.values()) {
      if (p.hp <= 0) continue;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (d < best) { best = d; target = p; }
    }
    if (target) {
      const a = Math.atan2(target.y - e.y, target.x - e.x);
      e.x += Math.cos(a) * e.speed * dt;
      e.y += Math.sin(a) * e.speed * dt;
      if (best < e.radius + 19 && now - (e.lastBite || 0) > 850) {
        target.hp = Math.max(0, target.hp - 9);
        e.lastBite = now;
      }
    }
  }

  for (const b of shots) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    for (const e of enemies) {
      if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) < e.radius + 5) {
        e.hp = 0; b.life = 0;
        const owner = players.get(b.owner);
        if (owner) owner.score += 10;
        break;
      }
    }
  }
  shots = shots.filter(b => b.life > 0 && b.x >= 0 && b.y >= 0 && b.x <= ARENA.width && b.y <= ARENA.height);
  enemies = enemies.filter(e => e.hp > 0);

  if (players.size && enemies.length === 0 && worldTime > 3) {
    wave++;
    io.emit("feed", `Wave ${wave} incoming. Stay together!`);
    worldTime = 0;
  }

  io.volatile.emit("state", makeSnapshot());
}, 1000 / 30);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Last Signal Online running on port ${PORT}`));

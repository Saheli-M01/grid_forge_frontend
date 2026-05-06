// Must be first — loads .env.local before any other import uses process.env
import { config } from "dotenv";
config({ path: ".env.local" });

import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import next from "next";
import pool, {
  initSchema,
  loadGrid,
  claimCell,
  renameUserCells,
} from "./src/lib/db";
import type { ActivityEvent } from "./src/lib/types";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

//  Constants

const GRID_COLS = 40;
const GRID_ROWS = 30;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;
const COOLDOWN_MS = 500;
const LOCK_DURATION_MS = 10_000; // cell protected for 10s after claim
const STREAK_RESET_MS = 3_000; // streak resets if no claim within 3s
const BOMB_EVERY_N = 20; // earn a bomb every 20 claims
const BOMB_RADIUS = 1; // 3×3 area (radius 1 = 1 cell in each dir)
const ACTIVITY_MAX = 20; // keep last 20 events in feed

const USER_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f43f5e",
  "#a855f7",
  "#0ea5e9",
  "#10b981",
  "#fb923c",
];

// State

interface Cell {
  owner: string | null;
  color: string | null;
  name: string | null;
  claimedAt: number | null;
  lockedUntil: number;
  contestCount: number;
}

interface User {
  id: string;
  name: string;
  color: string;
  score: number;
  ws: WebSocket;
  lastAction: number;
  streak: number;
  lastClaimAt: number;
  totalClaims: number;
  bombs: number;
}

let grid: Cell[] = [];
const users = new Map<string, User>();
let colorIndex = 0;

// Rolling activity feed (shared across all users)
const activityFeed: ActivityEvent[] = [];

// Helpers

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function broadcastAll(data: object) {
  const msg = JSON.stringify(data);
  for (const user of users.values()) {
    if (user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(msg);
    }
  }
}

function send(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function getLeaderboard() {
  return Array.from(users.values())
    .map((u) => ({
      id: u.id,
      name: u.name,
      color: u.color,
      score: u.score,
      streak: u.streak,
      bombs: u.bombs,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function rebuildScores() {
  const counts = new Map<string, number>();
  for (const cell of grid) {
    if (cell.owner) counts.set(cell.owner, (counts.get(cell.owner) ?? 0) + 1);
  }
  for (const user of users.values()) {
    user.score = counts.get(user.id) ?? 0;
  }
}

function pushActivity(event: ActivityEvent) {
  activityFeed.unshift(event);
  if (activityFeed.length > ACTIVITY_MAX) activityFeed.length = ACTIVITY_MAX;
}

/** Get cells in a bomb's blast area (3×3 centered on index) */
function getBombIndices(centerIdx: number): number[] {
  const centerCol = centerIdx % GRID_COLS;
  const centerRow = Math.floor(centerIdx / GRID_COLS);
  const indices: number[] = [];
  for (let dr = -BOMB_RADIUS; dr <= BOMB_RADIUS; dr++) {
    for (let dc = -BOMB_RADIUS; dc <= BOMB_RADIUS; dc++) {
      const r = centerRow + dr;
      const c = centerCol + dc;
      if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
        indices.push(r * GRID_COLS + c);
      }
    }
  }
  return indices;
}


// Bootstrap

async function bootstrap() {
  await initSchema();

  const rows = await loadGrid();
  grid = rows.map((r) => ({
    owner: r.owner_id,
    color: r.color,
    name: r.owner_name,
    claimedAt: r.claimed_at ? Number(r.claimed_at) : null,
    lockedUntil: r.locked_until ? Number(r.locked_until) : 0,
    contestCount: r.contest_count ?? 0,
  }));
  console.log(`[db] loaded ${grid.length} cells`);

  await app.prepare();

  const httpServer = createServer((req, res) => {
    // hard reset by admin by password endpoint
    if (req.url === "/admin/reset" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", async () => {
        try {
          const { password } = JSON.parse(body) as { password?: string };
          const secret = process.env.ADMIN_SECRET;

          if (!secret || password !== secret) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Wrong password" }));
            return;
          }

          // Reset DB
          await pool.query(
            `UPDATE cells SET owner_id=NULL, owner_name=NULL, color=NULL,
             claimed_at=NULL, locked_until=0, contest_count=0`
          );

          // Reset in-memory grid
          for (const cell of grid) {
            cell.owner = null;
            cell.color = null;
            cell.name = null;
            cell.claimedAt = null;
            cell.lockedUntil = 0;
            cell.contestCount = 0;
          }

          // Reset all user scores/streaks/bombs
          for (const user of users.values()) {
            user.score = 0;
            user.streak = 0;
            user.bombs = 0;
            user.totalClaims = 0;
          }

          // Broadcast reset to all connected clients
          broadcastAll({ type: "reset", grid });

          console.log("[admin] grid reset by admin");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Server error" }));
        }
      });
      return;
    }

    handle(req, res);
  });
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    if (req.url?.startsWith("/ws")) {
      wss.handleUpgrade(req, socket, head, (ws) =>
        wss.emit("connection", ws, req),
      );
    }
  });

  // Connection handler

  wss.on("connection", (ws: WebSocket, req) => {
    // Try to restore existing session from query param
    const urlParams = new URL(req.url ?? "/ws", "http://localhost");
    const requestedId = urlParams.searchParams.get("userId") ?? "";

    // Check if this userId already has cells in the grid (returning player)
    const existingColor = requestedId
      ? grid.find((c) => c.owner === requestedId)?.color ?? null
      : null;
    const existingName = requestedId
      ? grid.find((c) => c.owner === requestedId)?.name ?? null
      : null;

    // Reuse old id+color+name if valid, otherwise create fresh
    const userId = requestedId && existingColor ? requestedId : generateId();
    const color = existingColor ?? USER_COLORS[colorIndex % USER_COLORS.length];
    const name = existingName ?? `Player ${userId.slice(0, 4).toUpperCase()}`;
    if (!existingColor) colorIndex++;

    const user: User = {
      id: userId,
      name,
      color,
      score: 0,
      ws,
      lastAction: 0,
      streak: 0,
      lastClaimAt: 0,
      totalClaims: 0,
      bombs: 0,
    };
    users.set(userId, user);
    rebuildScores();

    send(ws, {
      type: "init",
      userId,
      color,
      name: user.name,
      grid,
      cols: GRID_COLS,
      rows: GRID_ROWS,
      leaderboard: getLeaderboard(),
      onlineCount: users.size,
      myBombs: user.bombs,
      myStreak: user.streak,
    });

    // Send recent activity to new user
    if (activityFeed.length > 0) {
      send(ws, { type: "activity", events: activityFeed.slice(0, 10) });
    }

    broadcastAll({
      type: "presence",
      onlineCount: users.size,
      leaderboard: getLeaderboard(),
    });

    //Message handler

    ws.on("message", (raw: Buffer) => {
      let msg: { type: string;[key: string]: unknown };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      //claim
      if (msg.type === "claim") {
        const index = Number(msg.index);
        if (index < 0 || index >= TOTAL_CELLS || isNaN(index)) return;

        const now = Date.now();

        // Cooldown check
        if (now - user.lastAction < COOLDOWN_MS) {
          send(ws, {
            type: "cooldown",
            remaining: COOLDOWN_MS - (now - user.lastAction),
          });
          return;
        }

        // Lock check — can't steal a protected cell
        const cell = grid[index];
        if (cell.lockedUntil > now && cell.owner !== userId) {
          send(ws, { type: "protected", index, lockedUntil: cell.lockedUntil });
          return;
        }

        user.lastAction = now;
        const previousOwner = cell.owner;
        const previousName = cell.name;

        // Streak logic
        if(previousOwner !== userId){
          const timeSinceLast = now - user.lastClaimAt;
        if (timeSinceLast <= STREAK_RESET_MS) {
          user.streak += 1;
        } else {
          user.streak = 1;
        }
        user.lastClaimAt = now;
        user.totalClaims += 1;
        }
        
        // Score multiplier based on streak
        const multiplier = user.streak >= 10 ? 3 : user.streak >= 5 ? 2 : 1;



        // Apply claim
        if (previousOwner && previousOwner !== userId) {
          const prev = users.get(previousOwner);
          if (prev) prev.score = Math.max(0, prev.score - 1);
        }
        if (previousOwner !== userId) {
          user.score += multiplier; 
        }

        cell.owner = userId;
        cell.color = user.color;
        cell.name = user.name;
        cell.claimedAt = now;
        cell.lockedUntil = now + LOCK_DURATION_MS;
        cell.contestCount += 1;

        // Bomb reward
        let bombEarned = false;
        if (user.totalClaims % BOMB_EVERY_N === 0) {
          user.bombs += 1;
          bombEarned = true;
        }

        // Activity feed
        const event: ActivityEvent = {
          actorId: userId,
          actorName: user.name,
          actorColor: user.color,
          victimName:
            previousOwner && previousOwner !== userId ? previousName : null,
          index,
          ts: now,
          isBomb: false,
        };
        pushActivity(event);

        // Persist
        claimCell(
          index,
          userId,
          user.name,
          user.color,
          now,
          now + LOCK_DURATION_MS,
        ).catch((err) => console.error("[db] claimCell error:", err.message));

        // Broadcast
        broadcastAll({
          type: "update",
          indices: [index],
          cells: [cell],
          owner: userId,
          color: user.color,
          name: user.name,
          leaderboard: getLeaderboard(),
          isBomb: false,
        });

        broadcastAll({ type: "activity", events: [event] });

        // Notify claimer of streak
        send(ws, { type: "streak", streak: user.streak, multiplier });

        // Notify claimer of bomb
        if (bombEarned) {
          send(ws, { type: "bomb_ready", bombs: user.bombs });
        }
      }

      // ── bomb ──────────────────────────────────────────────────────────────
      if (msg.type === "bomb") {
        const centerIndex = Number(msg.index);
        if (centerIndex < 0 || centerIndex >= TOTAL_CELLS || isNaN(centerIndex))
          return;
        if (user.bombs <= 0) return;

        const now = Date.now();
        user.bombs -= 1;

        const bombIndices = getBombIndices(centerIndex);
        const updatedCells: Cell[] = [];
        const updatedIndices: number[] = [];

        for (const idx of bombIndices) {
          const cell = grid[idx];
          // Bombs ignore lock protection
          const previousOwner = cell.owner;
          if (previousOwner && previousOwner !== userId) {
            const prev = users.get(previousOwner);
            if (prev) prev.score = Math.max(0, prev.score - 1);
          }
          if (previousOwner !== userId) {
            user.score += 1;
          }
          cell.owner = userId;
          cell.color = user.color;
          cell.name = user.name;
          cell.claimedAt = now;
          cell.lockedUntil = now + LOCK_DURATION_MS;
          cell.contestCount += 1;

          updatedCells.push(cell);
          updatedIndices.push(idx);

          claimCell(
            idx,
            userId,
            user.name,
            user.color,
            now,
            now + LOCK_DURATION_MS,
          ).catch((err) =>
            console.error("[db] bomb claimCell error:", err.message),
          );
        }

        const event: ActivityEvent = {
          actorId: userId,
          actorName: user.name,
          actorColor: user.color,
          victimName: null,
          index: centerIndex,
          ts: now,
          isBomb: true,
        };
        pushActivity(event);

        broadcastAll({
          type: "update",
          indices: updatedIndices,
          cells: updatedCells,
          owner: userId,
          color: user.color,
          name: user.name,
          leaderboard: getLeaderboard(),
          isBomb: true,
        });

        broadcastAll({ type: "activity", events: [event] });
        send(ws, { type: "bomb_ready", bombs: user.bombs });
      }

      // ── rename ────────────────────────────────────────────────────────────
      if (msg.type === "rename") {
        const newName = String(msg.name || "")
          .trim()
          .slice(0, 20);
        if (!newName) return;
        user.name = newName;

        for (const cell of grid) {
          if (cell.owner === userId) cell.name = newName;
        }

        renameUserCells(userId, newName).catch((err) =>
          console.error("[db] renameUserCells error:", err.message),
        );

        broadcastAll({
          type: "rename",
          userId,
          name: newName,
          leaderboard: getLeaderboard(),
        });
      }
    });

    ws.on("close", () => {
      users.delete(userId);
      broadcastAll({
        type: "presence",
        onlineCount: users.size,
        leaderboard: getLeaderboard(),
      });
    });

    ws.on("error", (err: Error) => {
      console.error(`[ws] socket error for ${userId}:`, err.message);
      users.delete(userId);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
}

//  Graceful shutdown

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

bootstrap().catch((err) => {
  console.error("[server] fatal bootstrap error:", err);
  process.exit(1);
});

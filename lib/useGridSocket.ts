"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type {
  CellState,
  LeaderboardEntry,
  ServerMessage,
  ClientMessage,
  ActivityEvent,
} from "./types";

export interface GridState {
  connected: boolean;
  userId: string | null;
  myColor: string | null;
  myName: string | null;
  grid: CellState[];
  cols: number;
  rows: number;
  leaderboard: LeaderboardEntry[];
  onlineCount: number;
  cooldownUntil: number;
  myStreak: number;
  myMultiplier: number;
  myBombs: number;
  activity: ActivityEvent[];
  lastBombIndices: number[];   // for bomb animation
}

const INITIAL_STATE: GridState = {
  connected: false,
  userId: null,
  myColor: null,
  myName: null,
  grid: [],
  cols: 40,
  rows: 30,
  leaderboard: [],
  onlineCount: 0,
  cooldownUntil: 0,
  myStreak: 0,
  myMultiplier: 1,
  myBombs: 0,
  activity: [],
  lastBombIndices: [],
};

// store user name from local storage so that even after refreshing it stays intact
const LS_KEY = "gridwar_player";

function loadFromStorage(): { userId: string; name: string; color: string } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToStorage(userId: string, name: string, color: string) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ userId, name, color }));
  } catch {}
}

export function useGridSocket() {
  const [state, setState] = useState<GridState>(INITIAL_STATE);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    // Pass saved userId in query param so server can restore the session
    const saved = loadFromStorage();
    const url = `${protocol}://${window.location.host}/ws${saved ? `?userId=${encodeURIComponent(saved.userId)}` : ""}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setState((s) => ({ ...s, connected: true }));

    ws.onmessage = (event: MessageEvent) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      if (msg.type === "init") {
        // Check if user had a saved name before this session
        const saved = loadFromStorage();
        const savedName = saved?.name;

        // Save new session identity (color + userId), but keep saved name if exists
        saveToStorage(msg.userId, savedName ?? msg.name, msg.color);

        setState({
          connected: true,
          userId: msg.userId,
          myColor: msg.color,
          myName: savedName ?? msg.name,
          grid: msg.grid,
          cols: msg.cols,
          rows: msg.rows,
          leaderboard: msg.leaderboard,
          onlineCount: msg.onlineCount,
          cooldownUntil: 0,
          myStreak: msg.myStreak,
          myMultiplier: 1,
          myBombs: msg.myBombs,
          activity: [],
          lastBombIndices: [],
        });

        // If saved name differs from server-assigned name, restore it
        if (savedName && savedName !== msg.name) {
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "rename", name: savedName }));
            }
          }, 100);
        }

      } else if (msg.type === "update") {
        setState((s) => {
          const newGrid = [...s.grid];
          const indices = msg.indices ?? [];
          const cells = msg.cells ?? [];
          for (let i = 0; i < indices.length; i++) {
            newGrid[indices[i]] = cells[i];
          }
          return {
            ...s,
            grid: newGrid,
            leaderboard: msg.leaderboard,
            lastBombIndices: msg.isBomb ? indices : [],
          };
        });

      } else if (msg.type === "presence") {
        setState((s) => ({
          ...s,
          onlineCount: msg.onlineCount,
          leaderboard: msg.leaderboard,
        }));

      } else if (msg.type === "rename") {
        setState((s) => {
          // Update localStorage if it's our own rename
          
          if (msg.userId === s.userId) {
            saveToStorage(s.userId!, msg.name, s.myColor!);
          }
          const newGrid = s.grid.map((cell) =>
            cell.owner === msg.userId ? { ...cell, name: msg.name } : cell
          );
          // Also update actorName in activity feed for this user
          const newActivity = s.activity.map((e) =>
            e.actorId === msg.userId ? { ...e, actorName: msg.name } : e
          );
          return {
            ...s,
            grid: newGrid,
            myName: msg.userId === s.userId ? msg.name : s.myName,
            leaderboard: msg.leaderboard,
            activity: newActivity,
          };
        });

      } else if (msg.type === "cooldown") {
        setState((s) => ({ ...s, cooldownUntil: Date.now() + msg.remaining }));

      } else if (msg.type === "streak") {
        setState((s) => ({
          ...s,
          myStreak: msg.streak,
          myMultiplier: msg.multiplier,
        }));

      } else if (msg.type === "bomb_ready") {
        setState((s) => ({ ...s, myBombs: msg.bombs }));

      } else if (msg.type === "activity") {
        setState((s) => ({
          ...s,
          activity: [...(msg.events ?? []), ...s.activity].slice(0, 20),
        }));

      } else if (msg.type === "reset") {
        setState((s) => ({
          ...s,
          grid: msg.grid,
          leaderboard: [],
          myStreak: 0,
          myMultiplier: 1,
          myBombs: 0,
          activity: [],
          lastBombIndices: [],
        }));
      }
    };

    ws.onclose = () => {
      setState((s) => ({ ...s, connected: false }));
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMsg = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const claimCell = useCallback(
    (index: number) => sendMsg({ type: "claim", index }),
    [sendMsg]
  );

  const useBomb = useCallback(
    (index: number) => sendMsg({ type: "bomb", index }),
    [sendMsg]
  );

  const rename = useCallback(
    (name: string) => sendMsg({ type: "rename", name }),
    [sendMsg]
  );

  return { state, claimCell, useBomb, rename };
}

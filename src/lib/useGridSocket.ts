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
  lastBombIndices: number[]; // for bomb animation
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

export function useGridSocket() {
  const [state, setState] = useState<GridState>(INITIAL_STATE);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendMsg = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    // Pass saved userId and color so server can restore the session
    const savedUserId = localStorage.getItem("playerUserId");
    const savedColor = localStorage.getItem("playerColor");
    const params = new URLSearchParams();
    if (savedUserId) params.set("userId", savedUserId);
    if (savedColor) params.set("color", savedColor);
    const query = params.toString();
    const url = `${protocol}://${window.location.host}/ws${query ? `?${query}` : ""}`;
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
        // Save userId and color for future reconnects
        const savedUserId = localStorage.getItem("playerUserId");
        const savedColor = localStorage.getItem("playerColor");

        // If server gave us the same userId we sent, keep our saved color
        // (server assigns a new color when user has no cells)
        const finalColor =
          savedUserId === msg.userId && savedColor ? savedColor : msg.color;

        // Always persist current session
        localStorage.setItem("playerUserId", msg.userId);
        localStorage.setItem("playerColor", finalColor);

        const savedName = localStorage.getItem("playerName");
        const finalName =
          savedName && savedName !== msg.name ? savedName : msg.name;

        setState({
          connected: true,
          userId: msg.userId,
          myColor: finalColor,
          myName: finalName,
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

        // Restore saved name if it differs from what server sent
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
          const newGrid = s.grid.map((cell) =>
            cell.owner === msg.userId ? { ...cell, name: msg.name } : cell,
          );
          // Also update actorName in activity feed for this user
          const newActivity = s.activity.map((e) =>
            e.actorId === msg.userId ? { ...e, actorName: msg.name } : e,
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

  const claimCell = useCallback(
    (index: number) => sendMsg({ type: "claim", index }),
    [sendMsg],
  );
  const unclaimCell = useCallback(
    (index: number) => sendMsg({ type: "unclaim", index }),
    [sendMsg],
  );
  const useBomb = useCallback(
    (index: number) => sendMsg({ type: "bomb", index }),
    [sendMsg],
  );

  const rename = useCallback(
    (name: string) => {
      // save to localStorage for persistence
      localStorage.setItem("playerName", name);
      sendMsg({ type: "rename", name });
    },
    [sendMsg],
  );

  return { state, claimCell, unclaimCell, useBomb, rename };
}

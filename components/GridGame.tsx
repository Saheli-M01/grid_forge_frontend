"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useGridSocket } from "@/lib/useGridSocket";
import Grid from "./Grid";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Tooltip from "./Tooltip";
import StreakToast from "./StreakToast";
import type { CellState } from "@/lib/types";

export default function GridGame() {
  const { state, claimCell, useBomb, rename } = useGridSocket();
  const [tooltip, setTooltip] = useState<{ index: number; x: number; y: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [streakVisible, setStreakVisible] = useState(false);
  const streakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStreak = useRef(0);

  // Show streak toast when streak increases
  useEffect(() => {
    if (state.myStreak > prevStreak.current && state.myStreak >= 3) {
      setStreakVisible(true);
      if (streakTimer.current) clearTimeout(streakTimer.current);
      streakTimer.current = setTimeout(() => setStreakVisible(false), 2000);
    }
    prevStreak.current = state.myStreak;
  }, [state.myStreak]);

  const handleCellClick = useCallback(
    (index: number, isBomb: boolean) => {
      if (isBomb) useBomb(index);
      else claimCell(index);
    },
    [claimCell, useBomb]
  );

  const handleCellHover = useCallback(
    (index: number | null, x: number, y: number) => {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      if (index === null) {
        tooltipTimer.current = setTimeout(() => setTooltip(null), 80);
        return;
      }
      setTooltip({ index, x, y });
    },
    []
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-950">
      <Header
        connected={state.connected}
        onlineCount={state.onlineCount}
        myName={state.myName}
        myColor={state.myColor}
        myStreak={state.myStreak}
        myMultiplier={state.myMultiplier}
        onRename={rename}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex items-center justify-center overflow-hidden p-4">
          {state.grid.length > 0 ? (
            <Grid
              grid={state.grid}
              cols={state.cols}
              rows={state.rows}
              userId={state.userId}
              myColor={state.myColor}
              cooldownUntil={state.cooldownUntil}
              myBombs={state.myBombs}
              lastBombIndices={state.lastBombIndices}
              onCellClick={handleCellClick}
              onCellHover={handleCellHover}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm">Connecting…</span>
            </div>
          )}
        </main>

        <Sidebar
          leaderboard={state.leaderboard}
          userId={state.userId}
          grid={state.grid}
          cols={state.cols}
          rows={state.rows}
          activity={state.activity}
        />
      </div>

      {tooltip && (
        <Tooltip
          cell={state.grid[tooltip.index]}
          x={tooltip.x}
          y={tooltip.y}
          isOwn={state.grid[tooltip.index].owner === state.userId}
        />
      )}

      {streakVisible && (
        <StreakToast streak={state.myStreak} multiplier={state.myMultiplier} />
      )}
    </div>
  );
}

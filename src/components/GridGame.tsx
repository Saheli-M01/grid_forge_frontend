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
  const { state, claimCell, unclaimCell, useBomb, rename } = useGridSocket();
  const [tooltip, setTooltip] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [streakVisible, setStreakVisible] = useState(false);
  const streakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStreak = useRef(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      if (isBomb) {
        useBomb(index);
        return;
      }

      const clickedCell = state.grid[index];
      if (clickedCell?.owner === state.userId) {
        unclaimCell(index);
        return;
      }

      claimCell(index);
    },
    [state.grid, state.userId, claimCell, unclaimCell, useBomb],
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
    [],
  );

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-gray-950 relative">
      <Header
        connected={state.connected}
        onlineCount={state.onlineCount}
        myName={state.myName}
        myColor={state.myColor}
        myStreak={state.myStreak}
        myMultiplier={state.myMultiplier}
        onRename={rename}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <main className="flex-1 flex items-center justify-center overflow-hidden p-2 sm:p-4">
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
              <span className="text-xs sm:text-sm">Connecting…</span>
            </div>
          )}
        </main>

        {/* Desktop Sidebar */}
        <div className="hidden md:block md:w-80 border-l border-gray-800 overflow-hidden bg-gray-950">
          <Sidebar
            leaderboard={state.leaderboard}
            userId={state.userId}
            grid={state.grid}
            cols={state.cols}
            rows={state.rows}
            activity={state.activity}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed right-0 top-0 bottom-0 w-80 bg-gray-950 border-l border-gray-800 z-50 overflow-y-auto">
              <div className="p-4">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="float-right text-gray-400 hover:text-white mb-4"
                >
                  ✕
                </button>
                <div className="clear-both">
                  <Sidebar
                    leaderboard={state.leaderboard}
                    userId={state.userId}
                    grid={state.grid}
                    cols={state.cols}
                    rows={state.rows}
                    activity={state.activity}
                  />
                </div>
              </div>
            </div>
          </>
        )}
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

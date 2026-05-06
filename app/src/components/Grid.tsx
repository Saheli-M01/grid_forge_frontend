"use client";

import { Thermometer, Bomb, ZoomIn } from "lucide-react";
import type { CellState } from "../libs/types";

interface GridProps {
  grid: CellState[];
  cols: number;
  rows: number;
  userId: string | null;
  myColor: string | null;
  cooldownUntil: number;
  myBombs: number;
  lastBombIndices: number[];
  onCellClick: (index: number, isBomb: boolean) => void;
  onCellHover: (cell: CellState | null, x: number, y: number) => void;
}

const FLASH_DURATION = 600;
const BOMB_FLASH_DURATION = 900;
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const DISPLAY_ASPECT = 2.5;

export default function Grid({
  grid,
  cols,
  rows,
  userId,
  myColor,
  cooldownUntil,
  myBombs,
  lastBombIndices,
  onCellClick,
  onCellHover,
}: GridProps) {
  return (
    <div className="flex flex-col items-center gap-2 w-full h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 w-full">
        {/* Cooldown bar */}
        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{}} />
        </div>

        {/* Zoom badge */}
        <button className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-gray-800 border border-gray-700 text-gray-400 hover:text-white">
          <ZoomIn className="w-3 h-3" />
          1×
        </button>

        {/* Heatmap toggle */}
        <button className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border bg-orange-500/20 border-orange-500/50 text-orange-300">
          <Thermometer className="w-3.5 h-3.5" />
          Heatmap
        </button>

        {/* Bomb button */}
        <button className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border bg-red-500/20 border-red-500/60 text-red-300 animate-pulse">
          <Bomb className="w-3.5 h-3.5" />×{myBombs}
          <span className="text-red-400 font-bold ml-1">ARMED</span>
        </button>
      </div>

      {/* Canvas (dummy visual) */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
        <div className="w-full h-[300px] bg-gray-800 rounded-sm shadow-2xl shadow-black/60 flex items-center justify-center text-gray-500">
          Canvas Area
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-600">
        40 × 30 · 20 / 1200 claimed
        <span className="ml-2 text-blue-500/60">
          · scroll to zoom · drag to pan · dbl-click to reset
        </span>
        <span className="ml-2 text-orange-500/70">· heatmap on</span>
      </p>
    </div>
  );
}

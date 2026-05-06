"use client";

import { Lock } from "lucide-react";
import type { CellState } from "@/lib/types";

interface TooltipProps {
  cell: CellState;
  x: number;
  y: number;
  isOwn: boolean;
}

function timeAgo(ts: number | null): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 5000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

function lockRemaining(lockedUntil: number | null): string | null {
  if (!lockedUntil) return null;
  const remaining = lockedUntil - Date.now();
  if (remaining <= 0) return null;
  return `${(remaining / 1000).toFixed(1)}s`;
}

export default function Tooltip({ cell, x, y, isOwn }: TooltipProps) {
  const lockLeft = lockRemaining(cell.lockedUntil);
  const isLocked = !!lockLeft && !isOwn;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: x + 14, top: y - 10 }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-sm max-w-[200px]">
        {cell.owner ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cell.color ?? "#888" }} />
              <span className="font-medium text-white truncate">
                {cell.name}
                {isOwn && <span className="text-gray-400 font-normal ml-1">(you)</span>}
              </span>
            </div>
            {cell.claimedAt && (
              <p className="text-xs text-gray-500">Claimed {timeAgo(cell.claimedAt)}</p>
            )}
            {cell.contestCount > 1 && (
              <p className="text-xs text-gray-600 mt-0.5">Changed hands {cell.contestCount}×</p>
            )}
            {isLocked && (
              <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-400">
                <Lock className="w-3 h-3" />
                <span>Protected for {lockLeft}</span>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-400">Unclaimed — click to capture!</p>
        )}
      </div>
    </div>
  );
}

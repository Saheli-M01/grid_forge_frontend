"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { Flame, Bomb, Trophy, Medal, Award, Swords } from "lucide-react";
import type { CellState, LeaderboardEntry, ActivityEvent } from "@/lib/types";

interface SidebarProps {
  leaderboard: LeaderboardEntry[];
  userId: string | null;
  grid: CellState[];
  cols: number;
  rows: number;
  activity: ActivityEvent[];
}

const SECTIONS = [
  { id: "you",         label: "You",          minH: 72,  defaultH: 90  },
  { id: "coverage",    label: "Map Coverage", minH: 60,  defaultH: 72  },
  { id: "leaderboard", label: "Leaderboard",  minH: 60,  defaultH: 200 },
  { id: "feed",        label: "Live Feed",    minH: 60,  defaultH: 160 },
  { id: "minimap",     label: "Mini Map",     minH: 80,  defaultH: 140 },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function RankIcon({ rank }: { rank: number }) {
  if (rank === 0) return <Trophy className="w-3.5 h-3.5 text-yellow-400" />;
  if (rank === 1) return <Medal  className="w-3.5 h-3.5 text-gray-300"   />;
  if (rank === 2) return <Award  className="w-3.5 h-3.5 text-amber-600"  />;
  return <span className="text-xs text-gray-600 w-3.5 text-center">{rank + 1}</span>;
}

export default function Sidebar({ leaderboard, userId, grid, cols, rows, activity }: SidebarProps) {
  const totalCells   = cols * rows;
  const claimedCells = grid.filter((c) => c.owner !== null).length;
  const claimedPct   = totalCells > 0 ? (claimedCells / totalCells) * 100 : 0;

  const myEntry = useMemo(() => leaderboard.find((e) => e.id === userId), [leaderboard, userId]);
  const myRank  = useMemo(() => leaderboard.findIndex((e) => e.id === userId) + 1, [leaderboard, userId]);

  const [heights, setHeights] = useState<Record<SectionId, number>>(() =>
    Object.fromEntries(SECTIONS.map((s) => [s.id, s.defaultH])) as Record<SectionId, number>
  );

  const dragging = useRef<{ sectionId: SectionId; startY: number; startH: number } | null>(null);

  const onResizeStart = useCallback((e: React.MouseEvent, sectionId: SectionId) => {
    e.preventDefault();
    dragging.current = { sectionId, startY: e.clientY, startH: heights[sectionId] };
  }, [heights]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      const { sectionId, startY, startH } = dragging.current;
      const delta = e.clientY - startY;
      const minH  = SECTIONS.find((s) => s.id === sectionId)!.minH;
      setHeights((prev) => ({ ...prev, [sectionId]: Math.max(minH, startH + delta) }));
    }
    function onMouseUp() { dragging.current = null; }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function renderContent(id: SectionId) {
    switch (id) {
      case "you":
        if (!myEntry) return <p className="text-xs text-gray-600">Not connected</p>;
        return (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: myEntry.color }} />
                <span className="text-sm font-medium text-white truncate">{myEntry.name}</span>
              </div>
              <div className="text-right shrink-0 ml-2">
                <span className="text-lg font-bold text-white">{myEntry.score}</span>
                <span className="text-xs text-gray-500 ml-1">cells</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {myRank > 0 && <span className="text-xs text-gray-500">Rank #{myRank}</span>}
              {myEntry.streak >= 2 && (
                <span className="flex items-center gap-1 text-xs text-orange-400">
                  <Flame className="w-3 h-3" /> {myEntry.streak}x
                </span>
              )}
              {myEntry.bombs > 0 && (
                <span className="flex items-center gap-1 text-xs text-yellow-400">
                  <Bomb className="w-3 h-3" /> ×{myEntry.bombs}
                </span>
              )}
            </div>
          </>
        );

      case "coverage":
        return (
          <>
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>{claimedCells} / {totalCells} cells</span>
              <span>{claimedPct.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-300"
                style={{ width: `${claimedPct}%` }}
              />
            </div>
          </>
        );

      case "leaderboard":
        if (leaderboard.length === 0) return <p className="text-xs text-gray-600">No players yet</p>;
        return (
          <ol className="space-y-1">
            {leaderboard.map((entry, i) => (
              <li
                key={entry.id}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                  entry.id === userId ? "bg-gray-800" : "hover:bg-gray-800/50"
                }`}
              >
                <span className="shrink-0 flex items-center justify-center w-4">
                  <RankIcon rank={i} />
                </span>
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className={`text-sm truncate flex-1 ${entry.id === userId ? "text-white font-medium" : "text-gray-300"}`}>
                  {entry.name}
                  {entry.id === userId && <span className="text-gray-500 text-xs ml-1">(you)</span>}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {entry.streak >= 3 && <Flame className="w-3 h-3 text-orange-400" />}
                  {entry.bombs > 0   && <Bomb  className="w-3 h-3 text-yellow-400" />}
                  <span className="text-sm font-semibold text-white">{entry.score}</span>
                </div>
              </li>
            ))}
          </ol>
        );

      case "feed":
        if (activity.length === 0) return <p className="text-xs text-gray-600">No activity yet</p>;
        return (
          <div className="space-y-1.5">
            {activity.slice(0, 20).map((e, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: e.actorColor }} />
                <p className="text-gray-400 leading-tight">
                  {e.isBomb && <Bomb className="w-3 h-3 inline mr-1 text-orange-400" />}
                  <span className="text-white font-medium">{e.actorName}</span>
                  {e.victimName ? (
                    <>
                      <Swords className="w-3 h-3 inline mx-1 text-red-400" />
                      <span className="text-red-400">{e.victimName}</span>
                    </>
                  ) : (
                    <span className="text-gray-500"> claimed a cell</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        );

      case "minimap":
        return <MiniMap grid={grid} cols={cols} rows={rows} userId={userId} />;
    }
  }

  return (
    <aside className="w-64 shrink-0 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden select-none">
      <div className="flex-1 overflow-y-auto">
        {SECTIONS.map((section, idx) => (
          <div key={section.id} className="flex flex-col border-b border-gray-800 last:border-b-0">
            <div style={{ height: heights[section.id] }} className="overflow-y-auto">
              <div className="px-3 pt-3 pb-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">
                  {section.label}
                </p>
                {renderContent(section.id)}
              </div>
            </div>

            {/* Resize handle */}
            {idx < SECTIONS.length - 1 && (
              <div
                onMouseDown={(e) => onResizeStart(e, section.id)}
                className="h-2 flex items-center justify-center cursor-ns-resize group shrink-0"
                title="Drag to resize"
              >
                <div className="w-8 h-0.5 rounded-full bg-gray-700 group-hover:bg-gray-500 transition-colors" />
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

function MiniMap({ grid, cols, rows, userId }: {
  grid: CellState[]; cols: number; rows: number; userId: string | null;
}) {
  if (grid.length === 0) return null;
  const cellSize = 4;
  const w = cols * cellSize;
  const h = rows * cellSize;
  return (
    <div className="rounded overflow-hidden w-full">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{ display: "block", width: "100%", height: "auto" }}
        preserveAspectRatio="xMidYMid meet"
      >
        {grid.map((cell, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          return (
            <rect
              key={i}
              x={col * cellSize}
              y={row * cellSize}
              width={cellSize}
              height={cellSize}
              fill={cell.color ?? "#1f2937"}
              opacity={cell.owner === userId ? 1 : cell.color ? 0.65 : 1}
            />
          );
        })}
      </svg>
    </div>
  );
}

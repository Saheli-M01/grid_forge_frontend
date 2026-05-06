import { Flame, Bomb, Trophy, Medal, Award, Swords } from "lucide-react";
import type { CellState, LeaderboardEntry, ActivityEvent } from "../libs/types";
export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col">
      {/* YOU */}
      <div className="border-b border-gray-800 p-3">
        <p className="text-xs text-gray-500 mb-2">YOU</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-white text-sm">Diya</span>
          </div>
          <span className="text-white font-bold">120</span>
        </div>

        <div className="flex items-center gap-3 mt-2 text-xs">
          <span className="text-gray-500">Rank #1</span>
          <span className="flex items-center gap-1 text-orange-400">
            <Flame className="w-3 h-3" /> 3x
          </span>
          <span className="flex items-center gap-1 text-yellow-400">
            <Bomb className="w-3 h-3" /> ×2
          </span>
        </div>
      </div>

      {/* COVERAGE */}
      <div className="border-b border-gray-800 p-3">
        <p className="text-xs text-gray-500 mb-2">MAP COVERAGE</p>

        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>200 / 1200</span>
          <span>16.6%</span>
        </div>

        <div className="h-2 bg-gray-800 rounded-full">
          <div className="h-full bg-blue-500 rounded-full w-[16.6%]" />
        </div>
      </div>

      {/* LEADERBOARD */}
      <div className="border-b border-gray-800 p-3">
        <p className="text-xs text-gray-500 mb-2">LEADERBOARD</p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 bg-gray-800 p-2 rounded">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-white flex-1">Diya</span>
            <span className="text-white">120</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-4">2</span>
            <span className="text-gray-300 flex-1">Aman</span>
            <span className="text-white">90</span>
          </div>
        </div>
      </div>

      {/* FEED */}
      <div className="border-b border-gray-800 p-3">
        <p className="text-xs text-gray-500 mb-2">LIVE FEED</p>

        <div className="text-xs text-gray-400 space-y-1">
          <p>
            <span className="text-white">Diya</span> defeated Aman
          </p>
          <p>
            <span className="text-white">Aman</span> claimed a cell
          </p>
        </div>
      </div>

      {/* MINIMAP */}
      <div className="p-3">
        <p className="text-xs text-gray-500 mb-2">MINI MAP</p>

        <div className="grid grid-cols-10 gap-[1px]">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className={`w-full aspect-square ${
                i % 3 === 0 ? "bg-blue-500" : "bg-gray-700"
              }`}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

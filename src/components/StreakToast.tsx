"use client";

import { Flame, Zap } from "lucide-react";

interface StreakToastProps {
  streak: number;
  multiplier: number;
}

export default function StreakToast({ streak, multiplier }: StreakToastProps) {
  const isHot = multiplier >= 3;
  const isWarm = multiplier >= 2;

  return (
    <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-bounce px-4">
      <div
        className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full shadow-2xl border text-xs sm:text-sm font-bold whitespace-nowrap ${
          isHot
            ? "bg-red-500/20 border-red-500/60 text-red-300 shadow-red-500/20"
            : isWarm
              ? "bg-orange-500/20 border-orange-500/60 text-orange-300 shadow-orange-500/20"
              : "bg-yellow-500/20 border-yellow-500/60 text-yellow-300 shadow-yellow-500/20"
        }`}
      >
        <Flame className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
        <span>{streak}x Streak!</span>
        {multiplier > 1 && (
          <span
            className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full ${
              isHot ? "bg-red-500/30" : "bg-orange-500/30"
            }`}
          >
            <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
            {multiplier}×
          </span>
        )}
      </div>
    </div>
  );
}

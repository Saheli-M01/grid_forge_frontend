"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Users, Pencil, Flame, Zap } from "lucide-react";

interface HeaderProps {
  connected: boolean;
  onlineCount: number;
  myName: string | null;
  myColor: string | null;
  myStreak: number;
  myMultiplier: number;
  onRename: (name: string) => void;
}

export default function Header({
  connected,
  onlineCount,
  myName,
  myColor,
  myStreak,
  myMultiplier,
  onRename,
}: HeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function startEdit() { setDraft(myName ?? ""); setEditing(true); }
  function commitEdit() {
    const t = draft.trim();
    if (t && t !== myName) onRename(t);
    setEditing(false);
  }
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditing(false);
  }

  const streakColor =
    myMultiplier >= 3 ? "text-red-400" :
    myMultiplier >= 2 ? "text-orange-400" :
    "text-yellow-400";

  return (
    <header className="flex items-center justify-between px-5 py-2.5 bg-gray-900 border-b border-gray-800 shrink-0 z-10">

      {/* Logo */}
      <div className="flex items-center gap-3">
        <Image
          src="/logo.png"
          alt="GridWar logo"
          width={32}
          height={32}
          className="rounded-md"
          priority
        />
        <Image
          src="/brand.png"
          alt="GridWar"
          width={96}
          height={20}
          className="hidden sm:block"
          priority
          style={{ objectFit: "contain", height: 20, width: "auto" }}
        />
      </div>

      {/* Center: status indicators */}
      <div className="flex items-center gap-4 text-sm">
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-400 animate-pulse" : "bg-red-500"
            }`}
          />
          <span className="text-gray-400">
            {connected ? "Live" : "Reconnecting…"}
          </span>
        </div>

        {/* Online count */}
        <div className="flex items-center gap-1.5 text-gray-400">
          <Users className="w-4 h-4" />
          <span>{onlineCount} online</span>
        </div>

        {/* Streak badge */}
        {myStreak >= 2 && (
          <div className={`flex items-center gap-1 font-semibold ${streakColor}`}>
            <Flame className="w-4 h-4" />
            <span>{myStreak}x streak</span>
            {myMultiplier > 1 && (
              <span className="flex items-center gap-0.5 text-xs bg-orange-500/20 border border-orange-500/40 rounded px-1 py-0.5">
                <Zap className="w-3 h-3" />
                {myMultiplier}× pts
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: player identity */}
      <div className="flex items-center gap-2">
        {myColor && (
          <div
            className="w-3 h-3 rounded-full ring-2 ring-white/20"
            style={{ backgroundColor: myColor }}
          />
        )}
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 20))}
            onBlur={commitEdit}
            onKeyDown={handleKey}
            className="bg-gray-800 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500 w-36"
            maxLength={20}
          />
        ) : (
          <button
            onClick={startEdit}
            className="text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 group"
            title="Click to rename"
          >
            <span>{myName ?? "…"}</span>
            <Pencil className="w-3 h-3 text-gray-600 group-hover:text-gray-400 transition-colors" />
          </button>
        )}
      </div>
    </header>
  );
}

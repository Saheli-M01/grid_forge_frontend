"use client";
import Image from "next/image";
import { Users, Pencil, Flame, Zap } from "lucide-react";
export default function Header() {
  return (
    <header
      className="flex items-center justify-between px-5 py-2.5"
      style={{
        backgroundColor: "var(--color-surface)",
        borderBottom: `1px solid var(--color-border)`,
      }}
    >
      {/* LEFT: Logo */}
      <div className="flex items-end gap-3">
        <Image
          src="/logo.png"
          alt="Gridwar logo"
          width={32}
          height={32}
          className="rounded-md"
          priority
        />
        <Image
          src="/brand.png"
          alt="Gridwar logo"
          width={96}
          height={20}
          className="hidden sm:block"
          priority
          style={{ objectFit: "contain" }}
        />
      </div>

      {/* CENTER : status */}
      <div className="flex items-center gap-4 text-sm">
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full 
              bg-green-400 animate-pulse bg-red-500
            }`}
          />
          <span style={{ color: "var(--color-text-muted)" }}>Reconnecting</span>
        </div>

        {/* Online count*/}
        <div style={{ color: "var(--color-text-muted)" }}>2 online</div>

        {/* Streak badge*/}

        <div
          className={`flex items-center gap-3 font-semibold `}
          style={{ color: "var(--color-text-muted)" }}
        >
          <div className="flex gap-1">
            {" "}
            <Flame className="w-4 h-4 text-orange-400" />
            <span>3x streak</span>
          </div>

          <div className="flex gap-1">
            {" "}
            <span className="flex items-center gap-0.5 text-xs bg-orange-500/20 border border-orange-500/40 rounded px-1 py-0.5">
              <Zap className="w-3 h-3 text-amber-400" />× pts
            </span>
          </div>
        </div>
      </div>
      {/* RIGHT */}
      <div className="flex items-center gap-2">
        {/* Color */}
        <div className="w-3 h-3 rounded-full" />

        {/* Name */}

        <input
          className="px-2 py-1 text-sm border rounded-full"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
            color: "var(--color-text)",
          }}
        />

        <button
          className="text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 group"
          title="Click to rename"
          style={{ color: "var(--color-text-muted)" }}
        >
          <Pencil className="w-3 h-3 text-gray-600 group-hover:text-gray-400 transition-colors" />
          myName
        </button>
      </div>
    </header>
  );
}

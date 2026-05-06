"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Users, Pencil, Flame, Zap, RotateCcw, X } from "lucide-react";

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
  const [editing, setEditing]         = useState(false);
  const [draft, setDraft]             = useState("");
  const inputRef                      = useRef<HTMLInputElement>(null);

  // Reset modal state
  const [showReset, setShowReset]     = useState(false);
  const [password, setPassword]       = useState("");
  const [resetStatus, setResetStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg]       = useState("");
  const passwordRef                   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (showReset && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [showReset]);

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

  function openReset() {
    setPassword("");
    setResetStatus("idle");
    setErrorMsg("");
    setShowReset(true);
  }

  function closeReset() {
    setShowReset(false);
    setPassword("");
    setResetStatus("idle");
    setErrorMsg("");
  }

  async function handleReset() {
    if (!password.trim()) return;
    setResetStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setResetStatus("success");
        setTimeout(() => closeReset(), 1500);
      } else {
        const data = await res.json();
        setErrorMsg(data.error ?? "Wrong password");
        setResetStatus("error");
        setPassword("");
        passwordRef.current?.focus();
      }
    } catch {
      setErrorMsg("Network error. Try again.");
      setResetStatus("error");
    }
  }

  function handlePasswordKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleReset();
    if (e.key === "Escape") closeReset();
  }

  const streakColor =
    myMultiplier >= 3 ? "text-red-400" :
    myMultiplier >= 2 ? "text-orange-400" :
    "text-yellow-400";

  return (
    <>
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

        {/* Right: player identity + reset */}
        <div className="flex items-center gap-3">

          {/* Reset button */}
          <button
            onClick={openReset}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-gray-700 bg-gray-800 text-gray-400 hover:text-red-400 hover:border-red-500/50 transition-all"
            title="Reset grid (admin only)"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Color dot */}
          {myColor && (
            <div
              className="w-3 h-3 rounded-full ring-2 ring-white/20"
              style={{ backgroundColor: myColor }}
            />
          )}

          {/* Name / rename */}
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

      {/* Reset Modal */}
      {showReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeReset(); }}
        >
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-red-400" />
                <h2 className="text-white font-semibold">Reset Grid</h2>
              </div>
              <button
                onClick={closeReset}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning */}
            <p className="text-sm text-gray-400 mb-4">
              This will clear <span className="text-white font-medium">all cells </span> and reset everyone&apos;s scores. This cannot be undone.
            </p>

            {/* Password input */}
            <input
              ref={passwordRef}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setResetStatus("idle");
                setErrorMsg("");
              }}
              onKeyDown={handlePasswordKey}
              placeholder="Enter admin password"
              className={`w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border focus:outline-none transition-colors mb-3 ${
                resetStatus === "error"
                  ? "border-red-500 focus:border-red-400"
                  : "border-gray-600 focus:border-blue-500"
              }`}
            />

            {/* Error message */}
            {resetStatus === "error" && (
              <p className="text-xs text-red-400 mb-3">❌ {errorMsg}</p>
            )}

            {/* Success message */}
            {resetStatus === "success" && (
              <p className="text-xs text-green-400 mb-3">✅ Grid reset successfully!</p>
            )}

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={closeReset}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetStatus === "loading" || resetStatus === "success" || !password.trim()}
                className={`flex-1 px-3 py-2 text-sm rounded-lg font-medium transition-all ${
                  resetStatus === "loading"
                    ? "bg-red-500/50 text-red-200 cursor-wait"
                    : resetStatus === "success"
                    ? "bg-green-500/30 text-green-300 cursor-default"
                    : !password.trim()
                    ? "bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700"
                    : "bg-red-500/20 border border-red-500/60 text-red-300 hover:bg-red-500/30"
                }`}
              >
                {resetStatus === "loading" ? "Resetting…" : resetStatus === "success" ? "Done!" : "Reset Grid"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { Thermometer, ZoomIn } from "lucide-react";
import type { CellState } from "@/lib/types";

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
  onCellHover: (index: number | null, x: number, y: number) => void;
}

const FLASH_DURATION = 600;
const BOMB_FLASH_DURATION = 900;
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const DISPLAY_ASPECT = 2.5;

type ViewMode = "normal" | "heatmap";

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
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const flashMap     = useRef<Map<number, { ts: number; isBomb: boolean }>>(new Map());
  const animFrameRef = useRef<number>(0);
  const prevGridRef  = useRef<CellState[]>([]);

  const zoomRef   = useRef(1);
  const panRef    = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart  = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const [zoomDisplay, setZoomDisplay] = useState(1);
  const [cooldownPct, setCooldownPct] = useState(0);
  const [bombMode, setBombMode]       = useState(false);
  const [viewMode, setViewMode]       = useState<ViewMode>("normal");

  // Cooldown bar
  useEffect(() => {
    if (cooldownUntil <= Date.now()) { setCooldownPct(0); return; }
    const iv = setInterval(() => {
      const r = cooldownUntil - Date.now();
      if (r <= 0) { setCooldownPct(0); clearInterval(iv); }
      else setCooldownPct(r / 500);
    }, 16);
    return () => clearInterval(iv);
  }, [cooldownUntil]);

  // Flash detection
  useEffect(() => {
    const prev = prevGridRef.current;
    if (prev.length === grid.length) {
      for (let i = 0; i < grid.length; i++) {
        if (grid[i].owner !== prev[i]?.owner) {
          flashMap.current.set(i, { ts: Date.now(), isBomb: lastBombIndices.includes(i) });
        }
      }
    }
    prevGridRef.current = grid;
  }, [grid, lastBombIndices]);

  useEffect(() => { if (myBombs === 0) setBombMode(false); }, [myBombs]);

  function heatColor(count: number): string {
    const t = Math.min(count / 20, 1);
    return `rgb(${Math.round(30 + t * 225)},${Math.round(100 - t * 80)},${Math.round(200 - t * 180)})`;
  }

  function clampPan(px: number, py: number, zoom: number, cw: number, ch: number) {
    return {
      x: Math.min(0, Math.max(cw - cw * zoom, px)),
      y: Math.min(0, Math.max(ch - ch * zoom, py)),
    };
  }

  // Draw loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const CW = canvas.width;
    const CH = canvas.height;
    const zoom = zoomRef.current;
    const pan  = panRef.current;
    const cellW = (CW / cols) * zoom;
    const cellH = (CH / rows) * zoom;
    const now = Date.now();

    ctx.clearRect(0, 0, CW, CH);

    const startCol = Math.max(0, Math.floor(-pan.x / cellW));
    const startRow = Math.max(0, Math.floor(-pan.y / cellH));
    const endCol   = Math.min(cols, Math.ceil((CW - pan.x) / cellW));
    const endRow   = Math.min(rows, Math.ceil((CH - pan.y) / cellH));

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const i    = row * cols + col;
        const cell = grid[i];
        if (!cell) continue;

        const x = col * cellW + pan.x;
        const y = row * cellH + pan.y;

        const isOwn    = cell.owner === userId;
        const isLocked = (cell.lockedUntil ?? 0) > now && cell.owner !== userId;
        const flash    = flashMap.current.get(i);
        const flashAge = flash ? now - flash.ts : FLASH_DURATION + 1;
        const flashDur = flash?.isBomb ? BOMB_FLASH_DURATION : FLASH_DURATION;
        const isFlashing = flashAge < flashDur;

        if (viewMode === "heatmap") {
          ctx.fillStyle = heatColor(cell.contestCount);
          ctx.globalAlpha = 1;
        } else if (cell.color) {
          ctx.fillStyle = cell.color;
          ctx.globalAlpha = isOwn ? 1 : isLocked ? 0.55 : 0.75;
        } else {
          ctx.fillStyle = "#1f2937";
          ctx.globalAlpha = 1;
        }
        ctx.fillRect(x, y, cellW, cellH);
        ctx.globalAlpha = 1;

        if (isFlashing) {
          const progress = flashAge / flashDur;
          const alpha = (1 - progress) * (flash?.isBomb ? 0.95 : 0.7);
          ctx.fillStyle = flash?.isBomb ? `rgba(255,120,0,${alpha})` : `rgba(255,255,255,${alpha})`;
          ctx.fillRect(x, y, cellW, cellH);
        }

        if (isLocked && viewMode === "normal") {
          const lp = ((cell.lockedUntil ?? 0) - now) / 10_000;
          ctx.fillStyle = `rgba(0,0,0,${lp * 0.35})`;
          ctx.fillRect(x, y, cellW, cellH);
          if (cellW > 8) {
            ctx.fillStyle = "rgba(255,255,255,0.4)";
            ctx.beginPath();
            ctx.arc(x + cellW - 3, y + 3, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        if (isOwn && viewMode === "normal") {
          ctx.strokeStyle = "rgba(255,255,255,0.65)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 0.75, y + 0.75, cellW - 1.5, cellH - 1.5);
        }

        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, cellW, cellH);
      }
    }

    for (const [idx, f] of flashMap.current) {
      if (now - f.ts > (f.isBomb ? BOMB_FLASH_DURATION : FLASH_DURATION))
        flashMap.current.delete(idx);
    }

    animFrameRef.current = requestAnimationFrame(draw);
  }, [grid, cols, rows, userId, viewMode]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  // Canvas sizing — wide rectangle
  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;
    const observer = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      let w = width;
      let h = w / DISPLAY_ASPECT;
      if (h > height) { h = height; w = h * DISPLAY_ASPECT; }
      canvas.width  = Math.floor(w);
      canvas.height = Math.floor(h);
      canvas.style.width  = `${Math.floor(w)}px`;
      canvas.style.height = `${Math.floor(h)}px`;
      panRef.current = clampPan(panRef.current.x, panRef.current.y, zoomRef.current, Math.floor(w), Math.floor(h));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Wheel → zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect   = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const oldZoom = zoomRef.current;
      const delta   = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom * delta));
      const scale   = newZoom / oldZoom;
      const newPanX = mouseX - scale * (mouseX - panRef.current.x);
      const newPanY = mouseY - scale * (mouseY - panRef.current.y);
      zoomRef.current = newZoom;
      panRef.current  = clampPan(newPanX, newPanY, newZoom, canvas.width, canvas.height);
      setZoomDisplay(Math.round(newZoom * 10) / 10);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  // Mouse drag → pan
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (zoomRef.current <= 1) return;
    isPanning.current = true;
    panStart.current  = { mx: e.clientX, my: e.clientY, px: panRef.current.x, py: panRef.current.y };
    e.currentTarget.style.cursor = "grabbing";
  }, []);

  const onMouseMoveCanvas = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (isPanning.current) {
      const dx = e.clientX - panStart.current.mx;
      const dy = e.clientY - panStart.current.my;
      panRef.current = clampPan(panStart.current.px + dx, panStart.current.py + dy, zoomRef.current, canvas.width, canvas.height);
      return;
    }
    const rect  = canvas.getBoundingClientRect();
    const cx    = e.clientX - rect.left;
    const cy    = e.clientY - rect.top;
    const zoom  = zoomRef.current;
    const pan   = panRef.current;
    const cellW = (canvas.width  / cols) * zoom;
    const cellH = (canvas.height / rows) * zoom;
    const col   = Math.floor((cx - pan.x) / cellW);
    const row   = Math.floor((cy - pan.y) / cellH);
    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      onCellHover(row * cols + col, e.clientX, e.clientY);
    } else {
      onCellHover(null, 0, 0);
    }
  }, [cols, rows, grid, onCellHover]);

  const onMouseUpCanvas = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning.current) {
      isPanning.current = false;
      e.currentTarget.style.cursor = zoomRef.current > 1 ? "grab" : "crosshair";
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect  = canvas.getBoundingClientRect();
    const cx    = e.clientX - rect.left;
    const cy    = e.clientY - rect.top;
    const zoom  = zoomRef.current;
    const pan   = panRef.current;
    const cellW = (canvas.width  / cols) * zoom;
    const cellH = (canvas.height / rows) * zoom;
    const col   = Math.floor((cx - pan.x) / cellW);
    const row   = Math.floor((cy - pan.y) / cellH);
    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      onCellClick(row * cols + col, bombMode);
    }
  }, [cols, rows, bombMode, onCellClick]);

  const handleDblClick = useCallback(() => {
    zoomRef.current = 1;
    panRef.current  = { x: 0, y: 0 };
    setZoomDisplay(1);
  }, []);

  return (
    <div className="flex flex-col items-center gap-2 w-full h-full">

      {/* Toolbar */}
      <div className="flex items-center gap-3 w-full">
        {/* Cooldown bar */}
        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${cooldownPct * 100}%`,
              backgroundColor: myColor ?? "#3b82f6",
              transition: cooldownPct === 0 ? "none" : "width 16ms linear",
            }}
          />
        </div>

        {/* Zoom badge */}
        {zoomDisplay > 1 && (
          <button
            onClick={handleDblClick}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Click to reset zoom"
          >
            <ZoomIn className="w-3 h-3" />
            {zoomDisplay.toFixed(1)}×
          </button>
        )}

        {/* Heatmap toggle */}
        <button
          onClick={() => setViewMode((v) => v === "normal" ? "heatmap" : "normal")}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-all ${
            viewMode === "heatmap"
              ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
              : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
          }`}
          title="Toggle heatmap view"
        >
          <Thermometer className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{viewMode === "heatmap" ? "Heatmap" : "Normal"}</span>
        </button>

        {/* Bomb button */}
        <button
          onClick={() => myBombs > 0 && setBombMode((b) => !b)}
          disabled={myBombs === 0}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-all ${
            bombMode
              ? "bg-red-500/20 border-red-500/60 text-red-300 animate-pulse"
              : myBombs > 0
              ? "bg-gray-800 border-gray-700 text-gray-300 hover:border-red-500/50 hover:text-red-300"
              : "bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed"
          }`}
          title={myBombs > 0 ? "Use bomb (3×3 area)" : "Earn a bomb by claiming 20 cells"}
        >
          <span className="text-base leading-none">💣</span>
          <span>{myBombs > 0 ? `×${myBombs}` : "0"}</span>
          {bombMode && <span className="text-red-400 font-bold ml-1">ARMED</span>}
        </button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 w-full flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          onDoubleClick={handleDblClick}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMoveCanvas}
          onMouseUp={onMouseUpCanvas}
          onMouseLeave={() => { isPanning.current = false; onCellHover(null, 0, 0); }}
          className={`rounded-sm shadow-2xl shadow-black/60 ${bombMode ? "ring-2 ring-red-500/60" : ""}`}
          style={{
            imageRendering: "pixelated",
            cursor: zoomRef.current > 1 ? "grab" : "crosshair",
          }}
        />
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-600">
        {cols} × {rows} · {grid.filter((c) => c.owner !== null).length}/{grid.length} claimed
        {zoomDisplay > 1
          ? <span className="ml-2 text-blue-500/60">· scroll to zoom · drag to pan · dbl-click to reset</span>
          : <span className="ml-2 text-gray-700">· scroll to zoom in</span>
        }
        {viewMode === "heatmap" && <span className="ml-2 text-orange-500/70">· heatmap on</span>}
      </p>
    </div>
  );
}

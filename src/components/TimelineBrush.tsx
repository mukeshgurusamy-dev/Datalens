/**
 * TimelineBrush.tsx
 *
 * Interactive Timeline Brush & Drag-Zoom Control
 *
 * React Concepts Demonstrated:
 * ─ Custom Hook consumption (useTimelineBrush): encapsulates all brush logic
 * ─ Pointer Events API: cross-platform (mouse + touch + pen) drag handling
 * ─ useRef for DOM measurement (getBoundingClientRect for pixel → index mapping)
 * ─ Inline SVG mini-chart: lightweight sparkline rendered as SVG path
 * ─ Controlled range with imperative drag: ref-based drag state avoids
 *   re-renders during drag, only commits on pointerUp
 * ─ Memoized callbacks preventing unnecessary child re-renders
 */

import React, { useRef, useCallback, useMemo } from 'react';
import { Calendar, ZoomIn } from 'lucide-react';
import { useTimelineBrush } from '../hooks/useTimelineBrush';
import type { DatasetSchema } from '../types/dataset';

// ── Props ──────────────────────────────────────────────────────────────

interface TimelineBrushProps {
  dataset: DatasetSchema;
  dateColumnName?: string;
  onRangeChange?: (startDate: string, endDate: string, filteredIndices: number[]) => void;
}

// ── Component ──────────────────────────────────────────────────────────

export const TimelineBrush: React.FC<TimelineBrushProps> = ({
  dataset,
  dateColumnName,
  onRangeChange,
}) => {
  const brush = useTimelineBrush(dataset.rows, dateColumnName);
  const trackRef = useRef<HTMLDivElement>(null);

  // Build sparkline data: aggregate numeric values by date
  const sparkline = useMemo(() => {
    if (!dateColumnName || brush.dateLabels.length === 0) return [];
    const numCol = dataset.columns.find((c) => c.type === 'number');
    if (!numCol) return [];

    const agg = new Map<string, number>();
    for (const row of dataset.rows) {
      const dateVal = String(row[dateColumnName] ?? '');
      const numVal = Number(row[numCol.name] ?? 0);
      if (!isNaN(numVal)) {
        agg.set(dateVal, (agg.get(dateVal) ?? 0) + numVal);
      }
    }

    return brush.dateLabels.map((d) => agg.get(d) ?? 0);
  }, [dataset, dateColumnName, brush.dateLabels]);

  // SVG sparkline path
  const sparklinePath = useMemo(() => {
    if (sparkline.length < 2) return '';
    const max = Math.max(...sparkline, 1);
    const w = 100;
    const h = 100;
    const stepX = w / (sparkline.length - 1);

    return sparkline
      .map((val, i) => {
        const x = i * stepX;
        const y = h - (val / max) * h * 0.85;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [sparkline]);

  // Pixel → index mapping for drag
  const pixelToIndex = useCallback(
    (clientX: number): number => {
      if (!trackRef.current || brush.dateLabels.length === 0) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(ratio * (brush.dateLabels.length - 1));
    },
    [brush.dateLabels.length]
  );

  // Pointer move handler (attached to track during drag)
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = brush.dragRef.current;
      if (!drag.isDragging || !trackRef.current) return;

      const idx = pixelToIndex(e.clientX);
      const maxIdx = brush.dateLabels.length - 1;

      if (drag.handle === 'left') {
        brush.setRange(Math.min(idx, brush.range.endIndex), brush.range.endIndex);
      } else if (drag.handle === 'right') {
        brush.setRange(brush.range.startIndex, Math.max(idx, brush.range.startIndex));
      } else if (drag.handle === 'center') {
        const deltaIdx = idx - pixelToIndex(drag.startX);
        const rangeSize = drag.startRight - drag.startLeft;
        let newLeft = drag.startLeft + deltaIdx;
        let newRight = drag.startRight + deltaIdx;
        if (newLeft < 0) { newLeft = 0; newRight = rangeSize; }
        if (newRight > maxIdx) { newRight = maxIdx; newLeft = maxIdx - rangeSize; }
        brush.setRange(Math.max(0, newLeft), Math.min(maxIdx, newRight));
      }
    },
    [brush, pixelToIndex]
  );

  const handlePointerUp = useCallback(() => {
    brush.dragRef.current.isDragging = false;
    brush.dragRef.current.handle = null;
    if (onRangeChange) {
      onRangeChange(brush.startDate, brush.endDate, brush.filteredIndices);
    }
  }, [brush, onRangeChange]);

  if (!dateColumnName || brush.dateLabels.length < 2) return null;

  const totalLen = brush.dateLabels.length;
  const leftPercent = (brush.range.startIndex / (totalLen - 1)) * 100;
  const rightPercent = (brush.range.endIndex / (totalLen - 1)) * 100;
  const widthPercent = rightPercent - leftPercent;

  return (
    <div className="mt-4 mb-2 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Calendar className="w-3 h-3 text-indigo-400" />
          </div>
          <span className="text-xs font-semibold text-zinc-300">Timeline Brush</span>
          <span className="text-[10px] text-zinc-600 font-mono">
            {brush.startDate} → {brush.endDate}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono">
            {brush.filteredIndices.length.toLocaleString()} rows
          </span>
        </div>

        {/* Presets */}
        <div className="flex items-center gap-1">
          <ZoomIn className="w-3 h-3 text-zinc-600 mr-1" />
          {brush.presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => brush.applyPreset(preset.id)}
              className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-semibold transition-colors ${
                brush.activePreset === preset.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sparkline + Brush Track */}
      <div
        ref={trackRef}
        className="relative h-14 bg-zinc-900/50 rounded-lg overflow-hidden cursor-crosshair select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* SVG Sparkline Background */}
        {sparklinePath && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <path
              d={sparklinePath}
              fill="none"
              stroke="rgba(99, 102, 241, 0.3)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={sparklinePath + ` L100,100 L0,100 Z`}
              fill="rgba(99, 102, 241, 0.05)"
            />
          </svg>
        )}

        {/* Dimmed regions outside selection */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-zinc-950/60"
          style={{ width: `${leftPercent}%` }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 bg-zinc-950/60"
          style={{ width: `${100 - rightPercent}%` }}
        />

        {/* Selected region */}
        <div
          className="absolute top-0 bottom-0 border-y border-indigo-500/40 bg-indigo-500/10 cursor-grab active:cursor-grabbing"
          style={{ left: `${leftPercent}%`, width: `${Math.max(widthPercent, 0.5)}%` }}
          onPointerDown={(e) => brush.onPointerDown(e, 'center')}
        >
          {/* Left handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 bg-indigo-500/60 hover:bg-indigo-400 cursor-ew-resize rounded-l-sm transition-colors"
            onPointerDown={(e) => { e.stopPropagation(); brush.onPointerDown(e, 'left'); }}
          />
          {/* Right handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2 bg-indigo-500/60 hover:bg-indigo-400 cursor-ew-resize rounded-r-sm transition-colors"
            onPointerDown={(e) => { e.stopPropagation(); brush.onPointerDown(e, 'right'); }}
          />
        </div>
      </div>

      {/* Axis Labels */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] text-zinc-600 font-mono">{brush.dateLabels[0]}</span>
        <span className="text-[9px] text-zinc-600 font-mono">
          {brush.dateLabels[Math.floor(totalLen / 2)]}
        </span>
        <span className="text-[9px] text-zinc-600 font-mono">{brush.dateLabels[totalLen - 1]}</span>
      </div>
    </div>
  );
};

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
import { motion } from 'motion/react';
import { Calendar, ZoomIn } from 'lucide-react';
import { useTimelineBrush } from '../hooks/useTimelineBrush';
import { normalizeDateKey, parseNumberValue } from '../engine/profiler';
import type { DatasetSchema } from '../types/dataset';

// ── Props ──────────────────────────────────────────────────────────────

interface TimelineBrushProps {
  dataset: DatasetSchema;
  dateColumnName?: string;
  onRangeChange?: (startDate: string, endDate: string, filteredIndices?: number[]) => void;
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
      const dateVal = normalizeDateKey(row[dateColumnName]);
      if (!dateVal) continue;
      const raw = row[numCol.name];
      const numVal = typeof raw === 'number' ? raw : parseNumberValue(raw);
      if (numVal !== null && !isNaN(numVal) && Number.isFinite(numVal)) {
        agg.set(dateVal, (agg.get(dateVal) ?? 0) + numVal);
      }
    }

    return brush.dateLabels.map((d) => agg.get(d) ?? 0);
  }, [dataset, dateColumnName, brush.dateLabels]);

  // SVG sparkline path
  const sparklinePath = useMemo(() => {
    if (sparkline.length < 2) return '';
    let max = 1;
    for (let i = 0; i < sparkline.length; i++) {
      if (sparkline[i] > max) max = sparkline[i];
    }
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
    if (!brush.dragRef.current.isDragging) return;
    brush.dragRef.current.isDragging = false;
    brush.dragRef.current.handle = null;
    if (onRangeChange) {
      onRangeChange(brush.startDate, brush.endDate);
    }
  }, [brush.startDate, brush.endDate, onRangeChange]);

  const handlePresetClick = (presetId: string) => {
    brush.applyPreset(presetId);
    if (!onRangeChange) return;

    if (presetId === 'all') {
      onRangeChange('', '');
    } else {
      const totalLen = brush.dateLabels.length;
      if (totalLen === 0) return;
      const latestDateStr = brush.dateLabels[totalLen - 1];
      const preset = brush.presets.find((p) => p.id === presetId);
      if (preset && typeof preset.days === 'number') {
        const latestDate = new Date(latestDateStr);
        const cutoff = new Date(latestDate);
        cutoff.setDate(cutoff.getDate() - preset.days);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        onRangeChange(cutoffStr, latestDateStr);
      }
    }
  };

  if (!dateColumnName || brush.dateLabels.length < 2) return null;

  const totalLen = brush.dateLabels.length;
  const leftPercent = (brush.range.startIndex / (totalLen - 1)) * 100;
  const rightPercent = (brush.range.endIndex / (totalLen - 1)) * 100;
  const widthPercent = rightPercent - leftPercent;

  return (
    <div className="mb-5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs font-medium text-[var(--text-primary)]">Timeline Brush</span>
          <span className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
            {brush.startDate} → {brush.endDate}
          </span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-secondary)] font-mono tabular-nums">
            {brush.filteredIndices.length.toLocaleString()} rows
          </span>
        </div>

        {/* Presets */}
        <div className="flex items-center gap-1">
          <ZoomIn className="w-3 h-3 text-[var(--text-muted)] mr-1" />
          {brush.presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset.id)}
              className={`text-[11px] px-2 py-0.5 rounded-md font-mono font-medium transition-colors ${
                brush.activePreset === preset.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
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
        className="relative h-12 bg-[var(--bg-elevated)] rounded-lg overflow-hidden cursor-crosshair select-none touch-none border border-[var(--border-hairline)]"
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
            <motion.path
              d={sparklinePath}
              fill="none"
              stroke="rgba(59, 130, 246, 0.45)"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.path
              d={sparklinePath + ` L100,100 L0,100 Z`}
              fill="rgba(59, 130, 246, 0.08)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            />
          </svg>
        )}

        {/* Dimmed regions outside selection */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-[var(--bg-canvas)]/55"
          style={{ width: `${leftPercent}%` }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 bg-[var(--bg-canvas)]/55"
          style={{ width: `${100 - rightPercent}%` }}
        />

        {/* Selected region */}
        <div
          className="absolute top-0 bottom-0 border-y border-blue-500/40 bg-blue-500/10 cursor-grab active:cursor-grabbing"
          style={{ left: `${leftPercent}%`, width: `${Math.max(widthPercent, 0.5)}%` }}
          onPointerDown={(e) => brush.onPointerDown(e, 'center')}
        >
          {/* Left handle (44px touch hit target) */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500/80 hover:bg-blue-400 cursor-ew-resize rounded-l-sm transition-colors before:content-[''] before:absolute before:-inset-x-4 before:inset-y-0"
            onPointerDown={(e) => { e.stopPropagation(); brush.onPointerDown(e, 'left'); }}
          />
          {/* Right handle (44px touch hit target) */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2 bg-blue-500/80 hover:bg-blue-400 cursor-ew-resize rounded-r-sm transition-colors before:content-[''] before:absolute before:-inset-x-4 before:inset-y-0"
            onPointerDown={(e) => { e.stopPropagation(); brush.onPointerDown(e, 'right'); }}
          />
        </div>
      </div>

      {/* Axis Labels */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-[var(--text-muted)] font-mono">{brush.dateLabels[0]}</span>
        <span className="text-[10px] text-[var(--text-muted)] font-mono">
          {brush.dateLabels[Math.floor(totalLen / 2)]}
        </span>
        <span className="text-[10px] text-[var(--text-muted)] font-mono">{brush.dateLabels[totalLen - 1]}</span>
      </div>
    </div>
  );
};

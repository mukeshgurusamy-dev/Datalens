/**
 * useTimelineBrush.ts
 *
 * Custom hook for interactive timeline brush selection with drag-zoom
 *
 * React Concepts Demonstrated:
 * ─ Custom Hook composing useRef, useState, useCallback, useEffect
 * ─ Pointer events for cross-platform (mouse + touch) drag handling
 * ─ useRef for mutable drag state that doesn't trigger re-renders during drag
 * ─ Stable callback references via useCallback to prevent subscriber re-renders
 * ─ Controlled + uncontrolled pattern: hook manages internal state,
 *   exposes imperative API (setRange, resetRange, presets)
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────

export interface TimelineRange {
  /** Start index (inclusive) in the sorted date array */
  startIndex: number;
  /** End index (inclusive) in the sorted date array */
  endIndex: number;
}

export interface TimelinePreset {
  id: string;
  label: string;
  /** Number of days to look back from the latest date, or 'all' */
  days: number | 'all';
}

export interface TimelineBrushState {
  /** All unique sorted date labels from the dataset */
  dateLabels: string[];
  /** Current visible range */
  range: TimelineRange;
  /** Active preset id */
  activePreset: string;
  /** Available presets */
  presets: TimelinePreset[];
  /** Set range by indices */
  setRange: (startIndex: number, endIndex: number) => void;
  /** Reset to full range */
  resetRange: () => void;
  /** Apply a preset */
  applyPreset: (presetId: string) => void;
  /** Ref for drag state (mutable, no re-render during drag) */
  dragRef: React.MutableRefObject<DragState>;
  /** Handler for pointer down on the brush track */
  onPointerDown: (e: React.PointerEvent, handle: 'left' | 'right' | 'center') => void;
  /** Filtered start/end date strings */
  startDate: string;
  endDate: string;
  /** Filtered rows — only rows within the selected date range */
  filteredIndices: number[];
}

export interface DragState {
  isDragging: boolean;
  handle: 'left' | 'right' | 'center' | null;
  startX: number;
  startLeft: number;
  startRight: number;
}

// ── Default Presets ────────────────────────────────────────────────────

const DEFAULT_PRESETS: TimelinePreset[] = [
  { id: 'all', label: 'All', days: 'all' },
  { id: 'ytd', label: 'YTD', days: 365 },
  { id: '90d', label: '90D', days: 90 },
  { id: '30d', label: '30D', days: 30 },
  { id: '7d', label: '7D', days: 7 },
];

// ── Hook ───────────────────────────────────────────────────────────────

export function useTimelineBrush(
  rows: Record<string, any>[],
  dateColumnName: string | undefined
): TimelineBrushState {
  // Extract and sort unique dates
  const dateLabels = useMemo(() => {
    if (!dateColumnName) return [];
    const unique = new Set<string>();
    for (const row of rows) {
      const val = row[dateColumnName];
      if (val != null) unique.add(String(val));
    }
    return Array.from(unique).sort();
  }, [rows, dateColumnName]);

  const maxIndex = Math.max(0, dateLabels.length - 1);

  const [range, setRangeState] = useState<TimelineRange>({
    startIndex: 0,
    endIndex: maxIndex,
  });

  const [activePreset, setActivePreset] = useState('all');

  // Sync range when dataset or date labels change
  const prevMaxIndexRef = useRef(maxIndex);
  useEffect(() => {
    if (prevMaxIndexRef.current !== maxIndex) {
      prevMaxIndexRef.current = maxIndex;
      setRangeState({ startIndex: 0, endIndex: maxIndex });
      setActivePreset('all');
    }
  }, [maxIndex]);

  // Drag state stored in ref — no re-renders during drag
  const dragRef = useRef<DragState>({
    isDragging: false,
    handle: null,
    startX: 0,
    startLeft: 0,
    startRight: 0,
  });

  const setRange = useCallback(
    (startIndex: number, endIndex: number) => {
      const s = Math.max(0, Math.min(startIndex, maxIndex));
      const e = Math.max(s, Math.min(endIndex, maxIndex));
      setRangeState({ startIndex: s, endIndex: e });
      setActivePreset('custom');
    },
    [maxIndex]
  );

  const resetRange = useCallback(() => {
    setRangeState({ startIndex: 0, endIndex: maxIndex });
    setActivePreset('all');
  }, [maxIndex]);

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = DEFAULT_PRESETS.find((p) => p.id === presetId);
      if (!preset || dateLabels.length === 0) return;

      if (preset.days === 'all') {
        setRangeState({ startIndex: 0, endIndex: maxIndex });
      } else {
        const latestDate = new Date(dateLabels[maxIndex]);
        const cutoff = new Date(latestDate);
        cutoff.setDate(cutoff.getDate() - preset.days);
        const cutoffStr = cutoff.toISOString().split('T')[0];

        let startIdx = 0;
        for (let i = 0; i < dateLabels.length; i++) {
          if (dateLabels[i] >= cutoffStr) {
            startIdx = i;
            break;
          }
        }
        setRangeState({ startIndex: startIdx, endIndex: maxIndex });
      }
      setActivePreset(presetId);
    },
    [dateLabels, maxIndex]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent, handle: 'left' | 'right' | 'center') => {
      dragRef.current = {
        isDragging: true,
        handle,
        startX: e.clientX,
        startLeft: range.startIndex,
        startRight: range.endIndex,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [range]
  );

  // Computed filtered date range strings
  const startDate = dateLabels[range.startIndex] ?? '';
  const endDate = dateLabels[range.endIndex] ?? '';

  // Filter row indices that fall within the selected date range
  const filteredIndices = useMemo(() => {
    if (!dateColumnName || dateLabels.length === 0) return rows.map((_, i) => i);
    const start = dateLabels[range.startIndex];
    const end = dateLabels[range.endIndex];
    if (!start || !end) return rows.map((_, i) => i);

    const indices: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      const val = String(rows[i][dateColumnName] ?? '');
      if (val >= start && val <= end) {
        indices.push(i);
      }
    }
    return indices;
  }, [rows, dateColumnName, dateLabels, range]);

  return {
    dateLabels,
    range,
    activePreset,
    presets: DEFAULT_PRESETS,
    setRange,
    resetRange,
    applyPreset,
    dragRef,
    onPointerDown,
    startDate,
    endDate,
    filteredIndices,
  };
}

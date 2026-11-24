import { useSyncExternalStore } from 'react';
import type { DataFilterState, ChartRecommendation } from '../types/dataset';
import type { ExecutiveLens } from './personas';

export interface DashboardSnapshot {
  label: string;
  timestamp: number;
  filters: DataFilterState;
  customCharts: Record<string, ChartRecommendation>;
  persona: ExecutiveLens;
}

export interface HistoryState {
  past: DashboardSnapshot[];
  present: DashboardSnapshot | null;
  future: DashboardSnapshot[];
}

const MAX_HISTORY_DEPTH = 50;

let state: HistoryState = {
  past: [],
  present: null,
  future: [],
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export const historyStore = {
  init(initial: DashboardSnapshot) {
    state = {
      past: [],
      present: initial,
      future: [],
    };
    notify();
  },

  push(label: string, snapshot: Omit<DashboardSnapshot, 'label' | 'timestamp'>) {
    if (!state.present) {
      state = {
        past: [],
        present: { ...snapshot, label, timestamp: Date.now() },
        future: [],
      };
      notify();
      return;
    }

    // Deduplicate if identical
    const isSameFilters = JSON.stringify(state.present.filters) === JSON.stringify(snapshot.filters);
    const isSameCharts = JSON.stringify(state.present.customCharts) === JSON.stringify(snapshot.customCharts);
    const isSamePersona = state.present.persona === snapshot.persona;
    if (isSameFilters && isSameCharts && isSamePersona) {
      return;
    }

    const newPast = [...state.past, state.present].slice(-MAX_HISTORY_DEPTH);
    state = {
      past: newPast,
      present: { ...snapshot, label, timestamp: Date.now() },
      future: [], // New action clears redo future
    };
    notify();
  },

  undo(): DashboardSnapshot | null {
    if (state.past.length === 0 || !state.present) return null;

    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, state.past.length - 1);

    state = {
      past: newPast,
      present: previous,
      future: [state.present, ...state.future],
    };
    notify();
    return previous;
  },

  redo(): DashboardSnapshot | null {
    if (state.future.length === 0 || !state.present) return null;

    const next = state.future[0];
    const newFuture = state.future.slice(1);

    state = {
      past: [...state.past, state.present],
      present: next,
      future: newFuture,
    };
    notify();
    return next;
  },

  jumpTo(index: number): DashboardSnapshot | null {
    const all = [...state.past, ...(state.present ? [state.present] : []), ...state.future];
    if (index < 0 || index >= all.length) return null;

    const target = all[index];
    state = {
      past: all.slice(0, index),
      present: target,
      future: all.slice(index + 1),
    };
    notify();
    return target;
  },

  getSnapshot(): HistoryState {
    return state;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  clear() {
    state = { past: [], present: null, future: [] };
    notify();
  },
};

export function useHistory(): HistoryState {
  return useSyncExternalStore(
    historyStore.subscribe,
    historyStore.getSnapshot,
    historyStore.getSnapshot
  );
}

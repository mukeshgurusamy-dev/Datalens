import { useSyncExternalStore } from 'react';

export interface ProfilerCommit {
  id: string;
  phase: 'mount' | 'update' | 'nested-update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
}

export interface TelemetryState {
  commits: ProfilerCommit[];
  latestCommit: ProfilerCommit | null;
  totalCommitCount: number;
  avgDurationMs: number;
  maxDurationMs: number;
}

const MAX_HISTORY = 30;

let state: TelemetryState = {
  commits: [],
  latestCommit: null,
  totalCommitCount: 0,
  avgDurationMs: 0,
  maxDurationMs: 0,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export const telemetryStore = {
  recordCommit(commit: ProfilerCommit) {
    const updatedCommits = [commit, ...state.commits].slice(0, MAX_HISTORY);
    const sum = updatedCommits.reduce((acc, c) => acc + c.actualDuration, 0);
    const avg = updatedCommits.length > 0 ? sum / updatedCommits.length : 0;
    const max = Math.max(state.maxDurationMs, commit.actualDuration);

    state = {
      commits: updatedCommits,
      latestCommit: commit,
      totalCommitCount: state.totalCommitCount + 1,
      avgDurationMs: Math.round(avg * 100) / 100,
      maxDurationMs: Math.round(max * 100) / 100,
    };
    notify();
  },

  getSnapshot(): TelemetryState {
    return state;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  clear() {
    state = {
      commits: [],
      latestCommit: null,
      totalCommitCount: 0,
      avgDurationMs: 0,
      maxDurationMs: 0,
    };
    notify();
  },
};

/**
 * React 19 Hook consuming the external telemetry store safely without tearing.
 */
export function useTelemetry(): TelemetryState {
  return useSyncExternalStore(
    telemetryStore.subscribe,
    telemetryStore.getSnapshot,
    telemetryStore.getSnapshot
  );
}

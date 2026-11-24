import { describe, it, expect, beforeEach } from 'vitest';
import { historyStore } from '../history-store';
import { telemetryStore } from '../telemetry-store';

describe('React Architecture - Time Travel History Store', () => {
  beforeEach(() => {
    historyStore.clear();
  });

  it('initializes state with initial snapshot', () => {
    historyStore.init({
      label: 'Initial',
      timestamp: Date.now(),
      filters: { searchQuery: '', selectedCategories: {} },
      customCharts: {},
      persona: 'cfo',
    });

    const snap = historyStore.getSnapshot();
    expect(snap.present).not.toBeNull();
    expect(snap.present?.label).toBe('Initial');
    expect(snap.past.length).toBe(0);
    expect(snap.future.length).toBe(0);
  });

  it('records incremental snapshots and supports Undo and Redo', () => {
    historyStore.init({
      label: 'Initial',
      timestamp: Date.now(),
      filters: { searchQuery: '', selectedCategories: {} },
      customCharts: {},
      persona: 'cfo',
    });

    historyStore.push('Filter Electronics', {
      filters: { searchQuery: 'electronics', selectedCategories: {} },
      customCharts: {},
      persona: 'cfo',
    });

    historyStore.push('Filter Status Completed', {
      filters: { searchQuery: 'electronics', selectedCategories: { status: ['completed'] } },
      customCharts: {},
      persona: 'cfo',
    });

    let snap = historyStore.getSnapshot();
    expect(snap.past.length).toBe(2);
    expect(snap.present?.label).toBe('Filter Status Completed');
    expect(snap.future.length).toBe(0);

    // Perform Undo
    const undone = historyStore.undo();
    expect(undone).not.toBeNull();
    expect(undone?.label).toBe('Filter Electronics');
    snap = historyStore.getSnapshot();
    expect(snap.past.length).toBe(1);
    expect(snap.future.length).toBe(1);

    // Perform Redo
    const redone = historyStore.redo();
    expect(redone).not.toBeNull();
    expect(redone?.label).toBe('Filter Status Completed');
    snap = historyStore.getSnapshot();
    expect(snap.past.length).toBe(2);
    expect(snap.future.length).toBe(0);
  });

  it('deduplicates identical state pushes', () => {
    historyStore.init({
      label: 'Initial',
      timestamp: Date.now(),
      filters: { searchQuery: '', selectedCategories: {} },
      customCharts: {},
      persona: 'cfo',
    });

    historyStore.push('Identical push', {
      filters: { searchQuery: '', selectedCategories: {} },
      customCharts: {},
      persona: 'cfo',
    });

    const snap = historyStore.getSnapshot();
    expect(snap.past.length).toBe(0); // Deduplicated!
  });

  it('supports direct jumpTo time-travel', () => {
    historyStore.init({
      label: 'Step 0',
      timestamp: 100,
      filters: { searchQuery: '', selectedCategories: {} },
      customCharts: {},
      persona: 'cfo',
    });

    historyStore.push('Step 1', {
      filters: { searchQuery: '1', selectedCategories: {} },
      customCharts: {},
      persona: 'cfo',
    });

    historyStore.push('Step 2', {
      filters: { searchQuery: '2', selectedCategories: {} },
      customCharts: {},
      persona: 'cfo',
    });

    const jumped = historyStore.jumpTo(0);
    expect(jumped?.label).toBe('Step 0');
    const snap = historyStore.getSnapshot();
    expect(snap.past.length).toBe(0);
    expect(snap.present?.label).toBe('Step 0');
    expect(snap.future.length).toBe(2);
  });
});

describe('React Architecture - Telemetry & Profiler Store', () => {
  beforeEach(() => {
    telemetryStore.clear();
  });

  it('records commits and maintains running duration averages', () => {
    telemetryStore.recordCommit({
      id: 'DataLensApp',
      phase: 'mount',
      actualDuration: 2.4,
      baseDuration: 5.0,
      startTime: 1000,
      commitTime: 1002.4,
    });

    telemetryStore.recordCommit({
      id: 'DataLensApp',
      phase: 'update',
      actualDuration: 1.6,
      baseDuration: 4.8,
      startTime: 1050,
      commitTime: 1051.6,
    });

    const snap = telemetryStore.getSnapshot();
    expect(snap.totalCommitCount).toBe(2);
    expect(snap.latestCommit?.phase).toBe('update');
    expect(snap.avgDurationMs).toBe(2.0); // (2.4 + 1.6) / 2 = 2.0
    expect(snap.maxDurationMs).toBe(2.4);
  });

  it('caps history at maximum window depth', () => {
    for (let i = 0; i < 40; i++) {
      telemetryStore.recordCommit({
        id: 'DataLensApp',
        phase: 'update',
        actualDuration: 1.0,
        baseDuration: 3.0,
        startTime: i * 10,
        commitTime: i * 10 + 1,
      });
    }

    const snap = telemetryStore.getSnapshot();
    expect(snap.commits.length).toBe(30);
    expect(snap.totalCommitCount).toBe(40);
  });
});

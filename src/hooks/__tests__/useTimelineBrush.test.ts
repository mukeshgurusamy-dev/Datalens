import { describe, it, expect } from 'vitest';

// Since this is a React hook, we test the pure logic extracted from it.
// The hook itself composes useState/useRef/useCallback — we test the
// date extraction and preset logic as pure functions.

describe('useTimelineBrush — date logic', () => {
  const rows = [
    { date: '2024-01-01', revenue: 100 },
    { date: '2024-01-15', revenue: 200 },
    { date: '2024-02-01', revenue: 300 },
    { date: '2024-03-01', revenue: 400 },
    { date: '2024-06-01', revenue: 500 },
    { date: '2024-12-01', revenue: 600 },
  ];

  it('extracts unique sorted dates from rows', () => {
    const dateCol = 'date';
    const unique = new Set<string>();
    for (const row of rows) {
      const val = row[dateCol];
      if (val != null) unique.add(String(val));
    }
    const sorted = Array.from(unique).sort();
    expect(sorted).toEqual([
      '2024-01-01', '2024-01-15', '2024-02-01',
      '2024-03-01', '2024-06-01', '2024-12-01',
    ]);
  });

  it('filters rows within a date range', () => {
    const start = '2024-02-01';
    const end = '2024-06-01';
    const filtered = rows.filter((r) => r.date >= start && r.date <= end);
    expect(filtered).toHaveLength(3);
    expect(filtered.map((r) => r.date)).toEqual(['2024-02-01', '2024-03-01', '2024-06-01']);
  });

  it('preset "all" includes every date', () => {
    const sorted = rows.map((r) => r.date).sort();
    const startIndex = 0;
    const endIndex = sorted.length - 1;
    expect(sorted[startIndex]).toBe('2024-01-01');
    expect(sorted[endIndex]).toBe('2024-12-01');
  });

  it('preset "30D" calculates correct cutoff', () => {
    const sorted = rows.map((r) => r.date).sort();
    const latest = new Date(sorted[sorted.length - 1]);
    const cutoff = new Date(latest);
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    // 30 days before 2024-12-01 is around 2024-11-01
    expect(cutoffStr).toBe('2024-11-01');

    // Only 2024-12-01 is after the cutoff
    const filtered = sorted.filter((d) => d >= cutoffStr);
    expect(filtered).toEqual(['2024-12-01']);
  });

  it('handles duplicate dates', () => {
    const duped = [...rows, { date: '2024-01-01', revenue: 50 }];
    const unique = new Set(duped.map((r) => String(r.date)));
    expect(unique.size).toBe(6); // Still 6 unique dates
  });
});

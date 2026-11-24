import { describe, it, expect } from 'vitest';
import {
  calculatePearsonCorrelation,
  classifyCorrelation,
  computeCorrelationMatrix,
} from '../worker-tasks';

describe('worker-tasks: calculatePearsonCorrelation', () => {
  it('computes perfect positive correlation (r = 1.0)', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    const r = calculatePearsonCorrelation(x, y);
    expect(r).toBe(1.0);
  });

  it('computes perfect negative correlation (r = -1.0)', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [10, 8, 6, 4, 2];
    const r = calculatePearsonCorrelation(x, y);
    expect(r).toBe(-1.0);
  });

  it('computes near-zero correlation for uncorrelated sequences', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [5, 2, 5, 2, 5];
    const r = calculatePearsonCorrelation(x, y);
    expect(Math.abs(r)).toBeLessThan(0.3);
  });

  it('handles edge case when length < 2 or variance is zero', () => {
    expect(calculatePearsonCorrelation([1], [2])).toBe(0);
    expect(calculatePearsonCorrelation([5, 5, 5], [1, 2, 3])).toBe(0);
  });
});

describe('worker-tasks: classifyCorrelation', () => {
  it('correctly classifies strength bands', () => {
    expect(classifyCorrelation(0.85)).toBe('strong_positive');
    expect(classifyCorrelation(0.45)).toBe('moderate_positive');
    expect(classifyCorrelation(0.1)).toBe('weak');
    expect(classifyCorrelation(-0.45)).toBe('moderate_negative');
    expect(classifyCorrelation(-0.9)).toBe('strong_negative');
  });
});

describe('worker-tasks: computeCorrelationMatrix', () => {
  const rows = [
    { revenue: 100, cost: 40, satisfaction: 8 },
    { revenue: 200, cost: 70, satisfaction: 7 },
    { revenue: 300, cost: 110, satisfaction: 6 },
    { revenue: 400, cost: 160, satisfaction: 5 },
    { revenue: 500, cost: 190, satisfaction: 4 },
  ];
  const numericColumns = ['revenue', 'cost', 'satisfaction'];

  it('computes symmetric matrix with 1.0 along the diagonal', () => {
    const res = computeCorrelationMatrix(rows, numericColumns);

    expect(res.numericColumns).toEqual(numericColumns);
    expect(res.matrix.length).toBe(3);
    expect(res.matrix[0][0].coefficient).toBe(1.0);
    expect(res.matrix[1][1].coefficient).toBe(1.0);
    expect(res.matrix[2][2].coefficient).toBe(1.0);

    // Symmetric check
    expect(res.matrix[0][1].coefficient).toBe(res.matrix[1][0].coefficient);
    expect(res.matrix[0][2].coefficient).toBe(res.matrix[2][0].coefficient);
  });

  it('identifies top correlated pairs', () => {
    const res = computeCorrelationMatrix(rows, numericColumns);
    expect(res.strongestPairs.length).toBeGreaterThan(0);
    // revenue and cost should be strong positive
    const revCost = res.strongestPairs.find(
      (p) => (p.colA === 'revenue' && p.colB === 'cost') || (p.colA === 'cost' && p.colB === 'revenue')
    );
    expect(revCost).toBeDefined();
    expect(revCost!.coefficient).toBeGreaterThan(0.9);
  });
});

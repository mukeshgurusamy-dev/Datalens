import { describe, it, expect } from 'vitest';
import {
  createDefaultParameters,
  pickScenarioColumns,
  runScenario,
  type ScenarioParameter,
} from '../scenario-simulator';
import type { DatasetSchema, ColumnProfile } from '../../types/dataset';

function makeDataset(overrides?: Partial<DatasetSchema>): DatasetSchema {
  return {
    id: 'test',
    name: 'Test Dataset',
    slug: 'test-dataset',
    rowCount: 4,
    columnCount: 2,
    columns: [
      { name: 'Region', type: 'category', nullableCount: 0, uniqueCount: 2 },
      { name: 'Revenue', type: 'number', nullableCount: 0, uniqueCount: 4, min: 100, max: 400, mean: 250, sum: 1000 },
    ] as ColumnProfile[],
    rows: [
      { Region: 'North', Revenue: 100 },
      { Region: 'North', Revenue: 200 },
      { Region: 'South', Revenue: 300 },
      { Region: 'South', Revenue: 400 },
    ],
    parsedAt: Date.now(),
    ...overrides,
  };
}

describe('createDefaultParameters', () => {
  it('returns 3 parameters with 0 percentChange', () => {
    const params = createDefaultParameters();
    expect(params).toHaveLength(3);
    expect(params.every((p) => p.percentChange === 0)).toBe(true);
  });
});

describe('pickScenarioColumns', () => {
  it('picks revenue-like column as numeric', () => {
    const ds = makeDataset();
    const result = pickScenarioColumns(ds.columns);
    expect(result).not.toBeNull();
    expect(result!.numericCol).toBe('Revenue');
    expect(result!.categoryCol).toBe('Region');
  });

  it('returns null when no numeric columns exist', () => {
    const result = pickScenarioColumns([
      { name: 'Name', type: 'category', nullableCount: 0, uniqueCount: 2 },
    ]);
    expect(result).toBeNull();
  });

  it('returns null when no category columns exist', () => {
    const result = pickScenarioColumns([
      { name: 'Value', type: 'number', nullableCount: 0, uniqueCount: 2 },
    ]);
    expect(result).toBeNull();
  });
});

describe('runScenario', () => {
  it('returns unchanged projections when all parameters are 0', () => {
    const ds = makeDataset();
    const params = createDefaultParameters();
    const result = runScenario(ds, 'Revenue', 'Region', params);

    expect(result.dataPoints).toHaveLength(2); // North and South
    expect(result.totalBaselineSum).toBe(1000);
    expect(result.totalProjectedSum).toBe(1000);
    expect(result.netImpact).toBe(0);
    expect(result.netImpactPercent).toBe(0);

    // Each point should have equal baseline and projected
    for (const dp of result.dataPoints) {
      expect(dp.projected).toBe(dp.baseline);
      expect(dp.delta).toBe(0);
    }
  });

  it('applies positive percentage correctly', () => {
    const ds = makeDataset();
    const params: ScenarioParameter[] = [
      { id: 'price', label: 'Price', percentChange: 10, min: -50, max: 50, step: 1 },
    ];
    const result = runScenario(ds, 'Revenue', 'Region', params);

    // 10% lift
    expect(result.totalProjectedSum).toBeCloseTo(1100, 1);
    expect(result.netImpactPercent).toBeCloseTo(10, 1);
  });

  it('applies negative percentage correctly', () => {
    const ds = makeDataset();
    const params: ScenarioParameter[] = [
      { id: 'churn', label: 'Churn', percentChange: -20, min: -50, max: 50, step: 1 },
    ];
    const result = runScenario(ds, 'Revenue', 'Region', params);

    expect(result.totalProjectedSum).toBeCloseTo(800, 1);
    expect(result.netImpact).toBeCloseTo(-200, 1);
  });

  it('compounds multiple parameters multiplicatively', () => {
    const ds = makeDataset();
    const params: ScenarioParameter[] = [
      { id: 'price', label: 'Price', percentChange: 10, min: -50, max: 50, step: 1 },
      { id: 'volume', label: 'Volume', percentChange: 20, min: -80, max: 100, step: 1 },
    ];
    const result = runScenario(ds, 'Revenue', 'Region', params);

    // Compound: 1.10 * 1.20 = 1.32
    expect(result.totalProjectedSum).toBeCloseTo(1320, 1);
    expect(result.netImpactPercent).toBeCloseTo(32, 1);
  });

  it('sorts data points descending by baseline', () => {
    const ds = makeDataset();
    const params = createDefaultParameters();
    const result = runScenario(ds, 'Revenue', 'Region', params);

    // South has 700, North has 300
    expect(result.dataPoints[0].label).toBe('South');
    expect(result.dataPoints[1].label).toBe('North');
  });
});

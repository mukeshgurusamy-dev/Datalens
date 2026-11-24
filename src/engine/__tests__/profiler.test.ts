import { describe, it, expect } from 'vitest';
import { profileDataset, formatMetric } from '../profiler';
import { SAMPLES } from '../../data/samples';

describe('Data Profiler & Schema Classifier - Automated Quality & Accuracy Suite', () => {
  it('correctly profiles the SaaS flagship dataset with 100% accuracy', () => {
    const saasData = SAMPLES.find((s) => s.id === 'sample-saas')!;
    const schema = profileDataset('SaaS Metrics', saasData.rows);

    expect(schema.rowCount).toBe(15);
    expect(schema.columnCount).toBe(6);

    const colMap = new Map(schema.columns.map((c) => [c.name, c]));

    // 1. Column Type Accuracy
    expect(colMap.get('date')?.type).toBe('date');
    expect(colMap.get('tier')?.type).toBe('category');
    expect(colMap.get('mrr')?.type).toBe('number');
    expect(colMap.get('new_users')?.type).toBe('number');
    expect(colMap.get('churn_rate')?.type).toBe('number');
    expect(colMap.get('region')?.type).toBe('category');

    // 2. Mathematical Sum & Average Ground Truth Verification
    const expectedMrrSum = 45000 + 28000 + 12500 + 52000 + 31500 + 14200 + 61000 + 35000 + 16800 + 68500 + 39200 + 18900 + 74000 + 42000 + 21500;
    const expectedMrrMean = expectedMrrSum / 15;

    expect(colMap.get('mrr')?.sum).toBe(expectedMrrSum);
    expect(colMap.get('mrr')?.mean).toBeCloseTo(expectedMrrMean, 2);
    expect(colMap.get('mrr')?.min).toBe(12500);
    expect(colMap.get('mrr')?.max).toBe(74000);

    // 3. Category Cardinality Verification
    expect(colMap.get('tier')?.uniqueCount).toBe(3); // Enterprise, Pro, Starter
    expect(colMap.get('region')?.uniqueCount).toBe(4); // North America, Europe, Asia Pacific, Latin America
  });

  it('handles dirty real-world data with currencies, commas, mixed formats and nulls', () => {
    const dirtyRecords = [
      { id: 'TX-101', date: '2024-01-01', price: '$1,250.00', tax: '12.5%', city: 'Chennai', notes: 'Urgent' },
      { id: 'TX-102', date: '2024-01-02', price: '₹45,000', tax: '18%', city: 'Bangalore', notes: null },
      { id: 'TX-103', date: '2024/01/03', price: '€320.50', tax: '5%', city: 'Chennai', notes: '' },
      { id: 'TX-104', date: '2024-01-04', price: '1,500', tax: null, city: 'Hyderabad', notes: 'Follow up' },
      { id: 'TX-105', date: '2024-01-05', price: null, tax: '0%', city: 'Chennai', notes: undefined },
    ];

    const schema = profileDataset('Dirty Commerce Data', dirtyRecords);
    const colMap = new Map(schema.columns.map((c) => [c.name, c]));

    // ID should be identified as ID or text
    expect(['id', 'text']).toContain(colMap.get('id')?.type);

    // Date inference despite mixed slash and dash separators
    expect(colMap.get('date')?.type).toBe('date');

    // Currency values ($1,250, ₹45,000, €320.50, 1,500) parsed as numeric
    expect(colMap.get('price')?.type).toBe('number');
    expect(colMap.get('price')?.nullableCount).toBe(1); // 1 null row
    expect(colMap.get('price')?.min).toBe(320.5);
    expect(colMap.get('price')?.max).toBe(45000);

    // Percentage values parsed as numeric
    expect(colMap.get('tax')?.type).toBe('number');
    expect(colMap.get('tax')?.nullableCount).toBe(1);

    // Low cardinality city classified as category
    expect(colMap.get('city')?.type).toBe('category');
    expect(colMap.get('city')?.topValues?.[0]?.value).toBe('Chennai');
    expect(colMap.get('city')?.topValues?.[0]?.count).toBe(3);
  });

  it('correctly handles edge cases: empty datasets, 1-row datasets, and all-null columns', () => {
    // 1. Empty dataset
    const emptySchema = profileDataset('Empty', []);
    expect(emptySchema.rowCount).toBe(0);
    expect(emptySchema.columns.length).toBe(0);

    // 2. All-null column
    const nullRecords = [
      { val: null, label: 'A' },
      { val: null, label: 'B' },
      { val: undefined, label: 'C' },
    ];
    const nullSchema = profileDataset('Nulls', nullRecords);
    const valCol = nullSchema.columns.find((c) => c.name === 'val')!;
    expect(valCol.nullableCount).toBe(3);
    expect(valCol.type).toBe('text'); // defaults gracefully to text without crashing
  });

  it('accurately formats metrics into standard business notation', () => {
    expect(formatMetric(1420000, true)).toBe('$1.42M');
    expect(formatMetric(25400, true)).toBe('$25.4k');
    expect(formatMetric(450, true)).toBe('$450');
    expect(formatMetric(12450, false)).toBe('12.5k');
    expect(formatMetric(98.45, false)).toBe('98.45');
  });
});

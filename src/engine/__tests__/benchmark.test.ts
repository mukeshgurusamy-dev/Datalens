import { describe, it, expect } from 'vitest';
import { profileDataset } from '../profiler';


describe('Comprehensive Quality & Accuracy Benchmark Suite', () => {
  it('achieves 100% type inference accuracy across diverse datasets', () => {
    const testCases = [
      {
        datasetName: 'Sensor Log',
        records: [
          { timestamp: '2024-03-01 10:00:00', sensor_id: 'S-01', temperature: 24.5, active: true },
          { timestamp: '2024-03-01 11:00:00', sensor_id: 'S-02', temperature: 26.1, active: true },
          { timestamp: '2024-03-01 12:00:00', sensor_id: 'S-03', temperature: 25.8, active: false },
        ],
        expectedTypes: {
          timestamp: 'date',
          sensor_id: 'id',
          temperature: 'number',
          active: 'boolean',
        },
      },
      {
        datasetName: 'Hospital Demographics',
        records: [
          { admission_date: '2024-02-14', patient_id: 'P-101', age: 45, ward: 'ICU', billing: '$4,500.00' },
          { admission_date: '2024-02-15', patient_id: 'P-102', age: 32, ward: 'General', billing: '$1,200.50' },
          { admission_date: '2024-02-16', patient_id: 'P-103', age: 58, ward: 'ICU', billing: '$6,800.00' },
        ],
        expectedTypes: {
          admission_date: 'date',
          patient_id: 'id',
          age: 'number',
          ward: 'category',
          billing: 'number',
        },
      },
    ];

    let totalColumnsTested = 0;
    let correctlyClassified = 0;

    for (const tc of testCases) {
      const schema = profileDataset(tc.datasetName, tc.records);
      for (const col of schema.columns) {
        totalColumnsTested++;
        const expected = (tc.expectedTypes as any)[col.name];
        if (col.type === expected) {
          correctlyClassified++;
        }
      }
    }

    const accuracy = (correctlyClassified / totalColumnsTested) * 100;
    expect(accuracy).toBe(100);
  });

  it('maintains 100% mathematical precision on numeric aggregations', () => {
    // Generate 100 rows of synthetic numerical data with known ground truth
    const groundTruth = {
      count: 100,
      sum: 0,
      min: Infinity,
      max: -Infinity,
    };

    const rows = Array.from({ length: 100 }, (_, i) => {
      const amount = (i + 1) * 10.5; // 10.5, 21.0, 31.5...
      groundTruth.sum += amount;
      groundTruth.min = Math.min(groundTruth.min, amount);
      groundTruth.max = Math.max(groundTruth.max, amount);
      return {
        id: `ID-${i}`,
        amount,
        tier: i % 2 === 0 ? 'Enterprise' : 'Starter',
      };
    });

    const schema = profileDataset('Synthetic Precision Test', rows);
    const amountCol = schema.columns.find((c) => c.name === 'amount')!;

    expect(amountCol.sum).toBeCloseTo(groundTruth.sum, 2);
    expect(amountCol.mean).toBeCloseTo(groundTruth.sum / groundTruth.count, 2);
    expect(amountCol.min).toBe(groundTruth.min);
    expect(amountCol.max).toBe(groundTruth.max);
  });
});

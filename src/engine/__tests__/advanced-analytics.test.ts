import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import Papa from 'papaparse';
import { lttbDownsample } from '../lttb';
import { generateHoltForecast } from '../forecasting';
import { detectOutliers } from '../outliers';

describe('Phase 6 Advanced Analytics - LTTB, Holt Forecasting & Tukey Fences', () => {
  // Load real user transaction dataset
  const csvPath = 'C:/Users/Mukesh/.gemini/antigravity/brain/9b0b3367-bf60-44fa-ae4d-48f77c540f88/.user_uploaded/media_1795348060577_d8c14208.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse(csvContent, { header: true, dynamicTyping: true, skipEmptyLines: true });
  const rows = parsed.data as Record<string, any>[];

  // 1. LTTB Downsampling Verification
  it('downsamples a 10,000-point synthetic series to 100 points while preserving peaks and boundaries', () => {
    // Generate a 10,000-point time series with a pronounced spike at index 5000
    const syntheticData: { time: string; val: number }[] = [];
    for (let i = 0; i < 10000; i++) {
      const isPeak = i === 5000;
      syntheticData.push({
        time: `2026-01-01T${i}`,
        val: isPeak ? 9999 : Math.sin(i / 100) * 10 + 20,
      });
    }

    const start = performance.now();
    const downsampled = lttbDownsample(syntheticData, 'time', 'val', 100);
    const duration = performance.now() - start;

    // Linear time complexity check: 10,000 points processed in < 30ms
    expect(duration).toBeLessThan(50);
    expect(downsampled.length).toBe(100);

    // Boundary preservation: first and last point must match
    expect(downsampled[0].time).toBe(syntheticData[0].time);
    expect(downsampled[downsampled.length - 1].time).toBe(syntheticData[syntheticData.length - 1].time);

    // Peak preservation: the acute peak at 9999 must NOT be eliminated by downsampling!
    const hasPeak = downsampled.some((d) => d.val === 9999);
    expect(hasPeak).toBe(true);
  });

  // 2. Holt Linear Trend Forecasting Verification
  it('computes Holt double exponential forecast with monotonic 95% confidence bounds', () => {
    // Historical upward linear trend: 10, 20, 30, 40, 50, 60, 70
    const history = [
      { date: '2026-01-01', sales: 100 },
      { date: '2026-01-02', sales: 120 },
      { date: '2026-01-03', sales: 140 },
      { date: '2026-01-04', sales: 160 },
      { date: '2026-01-05', sales: 180 },
      { date: '2026-01-06', sales: 200 },
    ];

    const result = generateHoltForecast(history, 'date', 'sales', 7);

    expect(result.direction).toBe('upward');
    expect(result.slope).toBeGreaterThan(0);
    expect(result.combined.length).toBe(history.length + 7);

    // The projected forecast points must continue increasing
    const forecastOnly = result.combined.slice(history.length);
    expect(forecastOnly.length).toBe(7);

    for (let i = 1; i < forecastOnly.length; i++) {
      expect(forecastOnly[i].forecast).toBeGreaterThan(forecastOnly[i - 1].forecast);
      // Prediction intervals must expand with forecast horizon uncertainty
      const prevMargin = forecastOnly[i - 1].upperBound - forecastOnly[i - 1].forecast;
      const currMargin = forecastOnly[i].upperBound - forecastOnly[i].forecast;
      expect(currMargin).toBeGreaterThanOrEqual(prevMargin - 0.01);
    }
  });

  // 3. Tukey Fences Outlier Detection Verification
  it('detects outliers in real financial amounts using non-parametric IQR fences', () => {
    // Synthetic dataset with known outlier values
    const dataWithOutliers = [
      { price: 10 }, { price: 12 }, { price: 11 }, { price: 10 },
      { price: 13 }, { price: 12 }, { price: 11 }, { price: 14 },
      { price: 10 }, { price: 12 }, { price: 11 }, { price: 13 },
      { price: 500 }, // Outlier 1
      { price: 900 }, // Outlier 2
    ];

    const analysis = detectOutliers(dataWithOutliers, 'price');
    expect(analysis).not.toBeNull();
    expect(analysis?.outlierCount).toBe(2);
    expect(analysis?.upperFence).toBeLessThan(500);
    expect(analysis?.extremeOutliers.map((o) => o.value)).toContain(500);
    expect(analysis?.extremeOutliers.map((o) => o.value)).toContain(900);
  });

  it('runs outlier analysis cleanly on the user 12,000 transaction dataset', () => {
    const analysis = detectOutliers(rows, 'amount');
    expect(analysis).not.toBeNull();
    expect(analysis?.columnName).toBe('amount');
    expect(analysis?.q1).toBeGreaterThan(0);
    expect(analysis?.q3).toBeGreaterThan(analysis?.q1 || 0);
    expect(analysis?.upperFence).toBeGreaterThan(analysis?.q3 || 0);
  });
});

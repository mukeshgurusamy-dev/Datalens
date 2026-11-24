/**
 * Non-Parametric Outlier Detection (Tukey's Fences)
 * Reference: John W. Tukey (1977), Exploratory Data Analysis.
 * Computes interquartile range (IQR) to detect statistical anomalies without normal distribution assumptions.
 */

export interface OutlierAnalysis {
  columnName: string;
  q1: number;
  median: number;
  q3: number;
  iqr: number;
  lowerFence: number;
  upperFence: number;
  outlierCount: number;
  outlierPercentage: number;
  outlierIndices: Set<number>;
  extremeOutliers: { value: number; rowIdx: number }[];
}

/**
 * Calculates percentile using linear interpolation between closest ranks.
 */
function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

/**
 * Performs Tukey's Fences outlier detection on a specified numerical column.
 */
export function detectOutliers(
  rows: Record<string, any>[],
  columnName: string
): OutlierAnalysis | null {
  if (!rows || rows.length < 4) return null;

  const validEntries: { val: number; idx: number }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i][columnName];
    const num = typeof raw === 'number' ? raw : Number(String(raw).replace(/[$€£,]/g, ''));
    if (!isNaN(num) && raw !== null && raw !== undefined && raw !== '') {
      validEntries.push({ val: num, idx: i });
    }
  }

  if (validEntries.length < 4) return null;

  // Sort values ascending
  validEntries.sort((a, b) => a.val - b.val);
  const values = validEntries.map((e) => e.val);

  const q1 = quantile(values, 0.25);
  const median = quantile(values, 0.5);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;

  const lowerFence = Math.round((q1 - 1.5 * iqr) * 100) / 100;
  const upperFence = Math.round((q3 + 1.5 * iqr) * 100) / 100;

  const outlierIndices = new Set<number>();
  const extremeOutliers: { value: number; rowIdx: number }[] = [];

  for (const entry of validEntries) {
    if (entry.val < lowerFence || entry.val > upperFence) {
      outlierIndices.add(entry.idx);
      extremeOutliers.push({ value: entry.val, rowIdx: entry.idx });
    }
  }

  const outlierPercentage =
    Math.round((extremeOutliers.length / validEntries.length) * 1000) / 10;

  return {
    columnName,
    q1: Math.round(q1 * 100) / 100,
    median: Math.round(median * 100) / 100,
    q3: Math.round(q3 * 100) / 100,
    iqr: Math.round(iqr * 100) / 100,
    lowerFence,
    upperFence,
    outlierCount: extremeOutliers.length,
    outlierPercentage,
    outlierIndices,
    extremeOutliers: extremeOutliers.slice(0, 10), // sample of top outliers
  };
}

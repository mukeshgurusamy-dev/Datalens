/**
 * worker-tasks.ts
 *
 * Compute-heavy statistics and correlation matrix calculations
 * designed to run seamlessly either in a background Web Worker or main thread fallback.
 */

export interface CorrelationCell {
  colA: string;
  colB: string;
  coefficient: number;
  strength: 'strong_positive' | 'moderate_positive' | 'weak' | 'moderate_negative' | 'strong_negative';
  sampleSize: number;
}

export interface CorrelationMatrixResult {
  numericColumns: string[];
  matrix: CorrelationCell[][];
  strongestPairs: CorrelationCell[];
  computedAt: number;
  computeTimeMs: number;
}

/**
 * Calculates Pearson Correlation Coefficient r between two numeric arrays
 * r = Σ((x - x_mean) * (y - y_mean)) / sqrt(Σ(x - x_mean)^2 * Σ(y - y_mean)^2)
 */
export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denominator = Math.sqrt(denomX * denomY);
  if (denominator === 0) return 0;

  const r = numerator / denominator;
  // Guard against floating point inaccuracies
  return Math.max(-1, Math.min(1, Math.round(r * 1000) / 1000));
}

export function classifyCorrelation(r: number): CorrelationCell['strength'] {
  if (r >= 0.7) return 'strong_positive';
  if (r >= 0.3) return 'moderate_positive';
  if (r <= -0.7) return 'strong_negative';
  if (r <= -0.3) return 'moderate_negative';
  return 'weak';
}

/**
 * Computes full n x n correlation matrix for all numeric columns in dataset
 */
export function computeCorrelationMatrix(
  rows: Record<string, any>[],
  numericColumns: string[]
): CorrelationMatrixResult {
  const startTime = performance.now();

  // Pre-extract and clean numeric vectors for fast column-wise math
  const vectors: Record<string, number[]> = {};
  for (const col of numericColumns) {
    vectors[col] = [];
  }

  for (const row of rows) {
    for (const col of numericColumns) {
      const val = Number(row[col]);
      vectors[col].push(!isNaN(val) && row[col] !== null && row[col] !== '' ? val : 0);
    }
  }

  const matrix: CorrelationCell[][] = [];
  const strongestPairs: CorrelationCell[] = [];

  for (let i = 0; i < numericColumns.length; i++) {
    const rowCells: CorrelationCell[] = [];
    const colA = numericColumns[i];
    const vecA = vectors[colA];

    for (let j = 0; j < numericColumns.length; j++) {
      const colB = numericColumns[j];
      const vecB = vectors[colB];

      if (i === j) {
        rowCells.push({
          colA,
          colB,
          coefficient: 1.0,
          strength: 'strong_positive',
          sampleSize: vecA.length,
        });
      } else {
        const r = calculatePearsonCorrelation(vecA, vecB);
        const cell: CorrelationCell = {
          colA,
          colB,
          coefficient: r,
          strength: classifyCorrelation(r),
          sampleSize: vecA.length,
        };
        rowCells.push(cell);

        // Only store unique pairs (i < j) for top correlations
        if (i < j && Math.abs(r) >= 0.25) {
          strongestPairs.push(cell);
        }
      }
    }
    matrix.push(rowCells);
  }

  strongestPairs.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));

  const endTime = performance.now();

  return {
    numericColumns,
    matrix,
    strongestPairs,
    computedAt: Date.now(),
    computeTimeMs: Math.round((endTime - startTime) * 100) / 100,
  };
}

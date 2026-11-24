/**
 * scenario-simulator.ts
 *
 * Executive "What-If" Sensitivity Simulator Engine
 *
 * React Concepts Demonstrated:
 * - Pure functional computation layer (no side effects, fully testable)
 * - Separation of concerns: engine logic ↔ React presentation
 * - Memoizable outputs (referentially stable when inputs are identical)
 *
 * Business Logic:
 * Given a numeric column of time-series data, applies parametric multipliers
 * to project "what-if" scenarios alongside the original baseline.
 */

import type { DatasetSchema, ColumnProfile } from '../types/dataset';

// ── Types ──────────────────────────────────────────────────────────────

export interface ScenarioParameter {
  id: string;
  label: string;
  /** Percentage change applied: 0 = no change, +10 = 10% lift, -15 = 15% decrease */
  percentChange: number;
  /** Range bounds for the slider */
  min: number;
  max: number;
  step: number;
}

export interface ScenarioDataPoint {
  label: string;
  baseline: number;
  projected: number;
  delta: number;
  deltaPercent: number;
}

export interface ScenarioResult {
  targetColumn: string;
  groupColumn: string;
  parameters: ScenarioParameter[];
  dataPoints: ScenarioDataPoint[];
  totalBaselineSum: number;
  totalProjectedSum: number;
  netImpact: number;
  netImpactPercent: number;
}

// ── Default Parameters ─────────────────────────────────────────────────

export function createDefaultParameters(): ScenarioParameter[] {
  return [
    {
      id: 'price',
      label: 'Price / Revenue Adjustment',
      percentChange: 0,
      min: -50,
      max: 50,
      step: 1,
    },
    {
      id: 'volume',
      label: 'Volume / Quantity Multiplier',
      percentChange: 0,
      min: -80,
      max: 100,
      step: 1,
    },
    {
      id: 'churn',
      label: 'Churn Reduction',
      percentChange: 0,
      min: -50,
      max: 50,
      step: 1,
    },
  ];
}

// ── Core Engine ────────────────────────────────────────────────────────

/**
 * Identify the best numeric and category columns for scenario analysis.
 * Prefers columns with names hinting at revenue, sales, profit, amount.
 */
export function pickScenarioColumns(
  columns: ColumnProfile[]
): { numericCol: string; categoryCol: string } | null {
  const numericCols = columns.filter((c) => c.type === 'number');
  const categoryCols = columns.filter((c) => c.type === 'category' || c.type === 'date');

  if (numericCols.length === 0 || categoryCols.length === 0) return null;

  const priorityKeywords = ['revenue', 'sales', 'profit', 'amount', 'total', 'price', 'income'];
  const sortedNumeric = [...numericCols].sort((a, b) => {
    const aScore = priorityKeywords.some((kw) => a.name.toLowerCase().includes(kw)) ? 0 : 1;
    const bScore = priorityKeywords.some((kw) => b.name.toLowerCase().includes(kw)) ? 0 : 1;
    return aScore - bScore;
  });

  return {
    numericCol: sortedNumeric[0].name,
    categoryCol: categoryCols[0].name,
  };
}

/**
 * Run the scenario simulation: aggregate baseline data by group,
 * then apply the compound multiplier from all parameter adjustments.
 *
 * The compound multiplier is: Π(1 + param.percentChange / 100) for all params.
 * This models independent multiplicative effects (e.g. +10% price AND +5% volume
 * yields 1.10 * 1.05 = 1.155x, or +15.5% net).
 */
export function runScenario(
  dataset: DatasetSchema,
  numericCol: string,
  categoryCol: string,
  parameters: ScenarioParameter[]
): ScenarioResult {
  // 1. Aggregate baseline values by category
  const groups = new Map<string, number>();
  for (const row of dataset.rows) {
    const key = String(row[categoryCol] ?? 'Unknown');
    const val = Number(row[numericCol] ?? 0);
    if (!isNaN(val)) {
      groups.set(key, (groups.get(key) ?? 0) + val);
    }
  }

  // 2. Calculate compound multiplier
  const compoundMultiplier = parameters.reduce((acc, param) => {
    return acc * (1 + param.percentChange / 100);
  }, 1);

  // 3. Build data points
  const entries = Array.from(groups.entries())
    .sort((a, b) => b[1] - a[1]) // Sort descending by baseline value
    .slice(0, 20); // Top 20 groups for performance

  const dataPoints: ScenarioDataPoint[] = entries.map(([label, baseline]) => {
    const projected = baseline * compoundMultiplier;
    const delta = projected - baseline;
    const deltaPercent = baseline !== 0 ? (delta / baseline) * 100 : 0;
    return { label, baseline, projected, delta, deltaPercent };
  });

  // 4. Totals
  const totalBaselineSum = dataPoints.reduce((sum, d) => sum + d.baseline, 0);
  const totalProjectedSum = dataPoints.reduce((sum, d) => sum + d.projected, 0);
  const netImpact = totalProjectedSum - totalBaselineSum;
  const netImpactPercent = totalBaselineSum !== 0 ? (netImpact / totalBaselineSum) * 100 : 0;

  return {
    targetColumn: numericCol,
    groupColumn: categoryCol,
    parameters,
    dataPoints,
    totalBaselineSum,
    totalProjectedSum,
    netImpact,
    netImpactPercent,
  };
}

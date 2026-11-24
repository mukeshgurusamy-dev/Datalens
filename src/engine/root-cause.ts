import type { DatasetSchema } from '../types/dataset';
import { formatMetric } from './profiler';

export interface RootCauseDriver {
  columnName: string;
  value: string;
  impactScore: number; // 0 to 100
  percentageOfTarget: number;
  explanation: string;
}

export interface AnomalyDiagnosis {
  targetMetric: string;
  targetCondition: string;
  totalAffectedRecords: number;
  totalAffectedValue: number;
  primaryDrivers: RootCauseDriver[];
  executiveSummary: string;
}

/**
 * Diagnoses the root cause of an anomaly (e.g. declined transactions, refunds, or metric drops)
 * by evaluating conditional variance contribution across all categorical dimensions.
 */
export function diagnoseRootCause(
  schema: DatasetSchema,
  targetColumn = 'status',
  targetValue = 'declined'
): AnomalyDiagnosis | null {
  if (!schema || schema.rowCount === 0) return null;

  const rows = schema.rows;
  const totalRows = schema.rowCount;

  const numericCols = schema.columns.filter((c) => c.type === 'number');
  const categoryCols = schema.columns.filter((c) => c.type === 'category' && c.name !== targetColumn);
  const primaryNumeric =
    numericCols.find((c) => /revenue|sales|amount|total|price|cost/i.test(c.name)) ||
    numericCols[0];
  const isCurrency = primaryNumeric ? /amount|revenue|price|cost/i.test(primaryNumeric.name) : false;

  // 1. Isolate the target subset (e.g. status === 'declined')
  const affectedRows = rows.filter(
    (r) => String(r[targetColumn] ?? '').trim().toLowerCase() === targetValue.toLowerCase()
  );

  if (affectedRows.length === 0) return null;

  const totalAffectedRecords = affectedRows.length;
  const totalAffectedValue = primaryNumeric
    ? affectedRows.reduce((acc, r) => acc + (Number(r[primaryNumeric.name]) || 0), 0)
    : 0;

  // 2. Compute concentration across all other categories
  const drivers: RootCauseDriver[] = [];

  for (const catCol of categoryCols) {
    const baselineDist = new Map<string, number>();
    for (const r of rows) {
      const val = String(r[catCol.name] ?? 'Other').trim();
      baselineDist.set(val, (baselineDist.get(val) || 0) + 1);
    }

    const affectedDist = new Map<string, number>();
    for (const r of affectedRows) {
      const val = String(r[catCol.name] ?? 'Other').trim();
      affectedDist.set(val, (affectedDist.get(val) || 0) + 1);
    }

    // Find segments with extreme over-representation
    for (const [val, countInAffected] of affectedDist.entries()) {
      const countInBaseline = baselineDist.get(val) || 1;
      const expectedRatio = countInBaseline / totalRows;
      const actualRatio = countInAffected / totalAffectedRecords;

      // Over-representation factor
      const lift = actualRatio / (expectedRatio || 0.001);

      if (lift > 1.25 && countInAffected >= 5) {
        const pctOfTarget = Math.round((countInAffected / totalAffectedRecords) * 100);
        const impactScore = Math.min(100, Math.round(lift * pctOfTarget));

        drivers.push({
          columnName: catCol.name,
          value: val,
          impactScore,
          percentageOfTarget: pctOfTarget,
          explanation: `${val} (${catCol.name}) accounts for ${pctOfTarget}% of all ${targetValue} records (${countInAffected} occurrences, ${(lift).toFixed(1)}x over-represented compared to normal baseline).`,
        });
      }
    }
  }

  // Sort drivers by impact score descending
  drivers.sort((a, b) => b.impactScore - a.impactScore);
  const primaryDrivers = drivers.slice(0, 3);

  // 3. Compose executive summary
  let executiveSummary = `${totalAffectedRecords.toLocaleString()} records (${((totalAffectedRecords / totalRows) * 100).toFixed(1)}% of volume) flagged as '${targetValue}'`;
  if (primaryNumeric && totalAffectedValue > 0) {
    executiveSummary += ` totaling ${formatMetric(totalAffectedValue, isCurrency)}`;
  }
  if (primaryDrivers.length > 0) {
    const top = primaryDrivers[0];
    executiveSummary += `. Primary operational bottleneck: concentrated in ${top.columnName}='${top.value}' (${top.percentageOfTarget}% concentration).`;
  } else {
    executiveSummary += `. The distribution is evenly spread across segments with no single structural bottleneck.`;
  }

  return {
    targetMetric: primaryNumeric?.name || 'Volume',
    targetCondition: `${targetColumn}='${targetValue}'`,
    totalAffectedRecords,
    totalAffectedValue,
    primaryDrivers,
    executiveSummary,
  };
}

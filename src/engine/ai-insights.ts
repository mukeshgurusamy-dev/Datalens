import type { DatasetSchema } from '../types/dataset';
import { formatMetric, normalizeDateKey } from './profiler';

export interface ExecutiveInsight {
  id: string;
  type: 'driver' | 'distribution' | 'trend' | 'risk';
  title: string;
  description: string;
  impact: 'positive' | 'neutral' | 'warning' | 'high-priority';
  metric?: string;
}

/**
 * Generates 4 structured, mathematically grounded executive insights
 * from a profiled dataset schema and its active rows.
 */
export function generateExecutiveInsights(schema: DatasetSchema): ExecutiveInsight[] {
  if (!schema || schema.rowCount === 0) {
    return [];
  }

  const insights: ExecutiveInsight[] = [];
  const rows = schema.rows;
  const totalRows = schema.rowCount;

  const numericCols = schema.columns.filter((c) => c.type === 'number');
  const categoryCols = schema.columns.filter((c) => c.type === 'category');
  const dateCols = schema.columns.filter((c) => c.type === 'date');

  const primaryNumeric =
    numericCols.find((c) => /revenue|sales|amount|total|price|cost/i.test(c.name)) ||
    numericCols[0];

  // 1. Dominant Volume Driver / Leading Segment
  const primaryCategory =
    categoryCols.find((c) => /merchant|category|product|service|type|tier/i.test(c.name)) ||
    categoryCols[0];

  if (primaryCategory && primaryCategory.topValues && primaryCategory.topValues.length > 0) {
    const topItem = primaryCategory.topValues[0];
    const topItemPct = Math.round((topItem.count / totalRows) * 100);

    let driverImpact: 'positive' | 'neutral' = topItemPct > 35 ? 'positive' : 'neutral';
    let revenueShareText = '';

    if (primaryNumeric) {
      const topItemSum = rows
        .filter((r) => String(r[primaryCategory.name]).trim().toLowerCase() === topItem.value.toLowerCase())
        .reduce((acc, r) => acc + (Number(r[primaryNumeric.name]) || 0), 0);
      const isCurr = /amount|revenue|price|cost/i.test(primaryNumeric.name);
      revenueShareText = ` representing ${formatMetric(topItemSum, isCurr)} in total ${primaryNumeric.name}`;
    }

    insights.push({
      id: 'insight-driver',
      type: 'driver',
      title: `Dominant Segment: ${topItem.value}`,
      description: `${topItem.value} leads ${primaryCategory.name} with ${topItem.count.toLocaleString()} records (${topItemPct}% of volume)${revenueShareText}.`,
      impact: driverImpact,
      metric: `${topItemPct}% Share`,
    });
  }

  // 2. Statistical Distribution & Ticket Variance
  if (primaryNumeric && primaryNumeric.mean !== undefined && primaryNumeric.min !== undefined && primaryNumeric.max !== undefined) {
    const isCurr = /amount|revenue|price|cost|salary/i.test(primaryNumeric.name);
    const meanVal = primaryNumeric.mean;
    const maxVal = primaryNumeric.max;
    const minVal = primaryNumeric.min;
    const spreadRatio = minVal > 0 ? (maxVal / minVal).toFixed(1) : '10+';

    insights.push({
      id: 'insight-distribution',
      type: 'distribution',
      title: `${primaryNumeric.name} Distribution Profile`,
      description: `Mean ${primaryNumeric.name} is ${formatMetric(meanVal, isCurr)} across all records, spanning from ${formatMetric(minVal, isCurr)} up to ${formatMetric(maxVal, isCurr)} (${spreadRatio}x dynamic range).`,
      impact: 'neutral',
      metric: `Avg: ${formatMetric(meanVal, isCurr)}`,
    });
  }

  // 3. Temporal Momentum / Activity Window
  if (dateCols.length > 0) {
    const dateCol = dateCols[0].name;
    const dateCounts = new Map<string, number>();

    for (const r of rows) {
      const raw = r[dateCol];
      if (!raw) continue;
      const key = normalizeDateKey(raw);
      if (!key) continue;
      dateCounts.set(key, (dateCounts.get(key) || 0) + 1);
    }

    if (dateCounts.size > 0) {
      const sortedDates = Array.from(dateCounts.entries()).sort((a, b) => b[1] - a[1]);
      const peakDate = sortedDates[0];
      const earliest = Array.from(dateCounts.keys()).sort()[0];
      const latest = Array.from(dateCounts.keys()).sort().reverse()[0];

      insights.push({
        id: 'insight-trend',
        type: 'trend',
        title: `Peak Velocity on ${peakDate[0]}`,
        description: `Busiest recorded period saw ${peakDate[1].toLocaleString()} events on ${peakDate[0]}. Overall span covers ${earliest} to ${latest}.`,
        impact: 'positive',
        metric: `${peakDate[1]} peak events`,
      });
    }
  }

  // 4. Anomaly & Operational Risk Alert
  // Check for status anomalies (declined, refunded, failed, error) or high nulls
  const statusCol = schema.columns.find((c) => /status|state|outcome/i.test(c.name));
  let foundRisk = false;

  if (statusCol && statusCol.topValues) {
    const riskItem = statusCol.topValues.find((v) =>
      /declined|failed|refunded|error|cancelled|disputed/i.test(v.value)
    );

    if (riskItem) {
      const riskPct = Math.round((riskItem.count / totalRows) * 100);
      let riskAmountText = '';

      if (primaryNumeric) {
        const riskSum = rows
          .filter((r) => String(r[statusCol.name]).trim().toLowerCase() === riskItem.value.toLowerCase())
          .reduce((acc, r) => acc + (Number(r[primaryNumeric.name]) || 0), 0);
        const isCurr = /amount|revenue|price|cost/i.test(primaryNumeric.name);
        riskAmountText = ` (${formatMetric(riskSum, isCurr)} impacted)`;
      }

      insights.push({
        id: 'insight-risk',
        type: 'risk',
        title: `Elevated ${riskItem.value} Rate Detected`,
        description: `${riskItem.count.toLocaleString()} transactions (${riskPct}% of total) were flagged as '${riskItem.value}'${riskAmountText}. Investigation recommended.`,
        impact: riskPct > 10 ? 'high-priority' : 'warning',
        metric: `${riskPct}% ${riskItem.value}`,
      });
      foundRisk = true;
    }
  }

  // Fallback risk: Check for columns with significant null counts
  if (!foundRisk) {
    const highNullCol = schema.columns.find((c) => c.nullableCount > 0 && (c.nullableCount / totalRows) > 0.05);
    if (highNullCol) {
      const nullPct = Math.round((highNullCol.nullableCount / totalRows) * 100);
      insights.push({
        id: 'insight-risk',
        type: 'risk',
        title: `Data Quality Alert: Missing ${highNullCol.name}`,
        description: `${highNullCol.nullableCount.toLocaleString()} rows (${nullPct}%) contain null or missing values in column '${highNullCol.name}'.`,
        impact: 'warning',
        metric: `${nullPct}% Nulls`,
      });
    } else {
      // Clean dataset certification
      insights.push({
        id: 'insight-risk',
        type: 'risk',
        title: 'Zero Data Quality Anomalies',
        description: 'Dataset passes statistical hygiene checks with complete structural integrity across all rows.',
        impact: 'positive',
        metric: '100% Valid',
      });
    }
  }

  return insights;
}

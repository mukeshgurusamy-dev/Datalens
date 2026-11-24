import type { DatasetSchema } from '../types/dataset';
import { formatMetric, parseNumberValue } from './profiler';

export interface QueryResult {
  answer: string;
  metricLabel?: string;
  metricValue?: string;
  supportingData?: { label: string; value: string | number }[];
  type: 'calculation' | 'ranking' | 'comparison' | 'summary' | 'unknown';
}

function matchEntityInQuery(query: string, candidate: string): boolean {
  if (!candidate || candidate.trim().length === 0) return false;
  const trimmed = candidate.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Word boundary matching ensures 2-letter country codes (e.g. 'DE') don't falsely match inside 'declined'
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return regex.test(query);
}

/**
 * Deterministic Natural Language Engine.
 * Parses user questions, extracts dimensions and metrics, and computes exact answers
 * against active rows with 0 hallucinations and sub-millisecond execution.
 */
export function answerNaturalLanguageQuery(
  query: string,
  schema: DatasetSchema
): QueryResult {
  const cleanQ = query.trim();
  if (!cleanQ || schema.rowCount === 0) {
    return {
      answer: 'Please provide a question about the active dataset.',
      type: 'unknown',
    };
  }

  const rows = schema.rows;
  const totalRows = schema.rowCount;

  const numericCols = schema.columns.filter((c) => c.type === 'number');
  const categoryCols = schema.columns.filter((c) => c.type === 'category');
  const primaryNumeric =
    numericCols.find((c) => /revenue|sales|amount|total|price|cost/i.test(c.name)) ||
    numericCols[0];
  const isCurrency = primaryNumeric
    ? /revenue|sales|amount|price|cost|salary/i.test(primaryNumeric.name)
    : false;

  // Flatten all unique category options and sort by string length descending
  // (so longer terms like "Food & Drink" or "declined" match before "DE" or "CA")
  const allCandidates: { colName: string; value: string; count: number }[] = [];
  for (const catCol of categoryCols) {
    if (catCol.topValues) {
      for (const valObj of catCol.topValues) {
        allCandidates.push({ colName: catCol.name, value: valObj.value, count: valObj.count });
      }
    }
  }
  allCandidates.sort((a, b) => b.value.length - a.value.length);

  // 1. Percentage Queries: e.g. "what percentage of transactions are declined?" or "decline percentage"
  if (/percent|percentage|share|ratio|rate/i.test(cleanQ)) {
    const matchedCandidate = allCandidates.find((c) => matchEntityInQuery(cleanQ, c.value));
    if (matchedCandidate) {
      const matchingCount = rows.filter(
        (r) => String(r[matchedCandidate.colName]).trim().toLowerCase() === matchedCandidate.value.toLowerCase()
      ).length;
      const pct = totalRows > 0 ? ((matchingCount / totalRows) * 100).toFixed(1) : '0.0';

      return {
        answer: `${matchedCandidate.value} accounts for ${pct}% of total records (${matchingCount.toLocaleString()} out of ${totalRows.toLocaleString()}).`,
        metricLabel: `${matchedCandidate.value} Share`,
        metricValue: `${pct}%`,
        supportingData: [
          { label: 'Matching Records', value: matchingCount.toLocaleString() },
          { label: 'Total Records', value: totalRows.toLocaleString() },
        ],
        type: 'calculation',
      };
    }
  }

  // 2. Comparison Queries: e.g. "compare settled vs declined"
  if (/compare|versus|vs/i.test(cleanQ)) {
    const matchedCandidates = allCandidates.filter((c) => matchEntityInQuery(cleanQ, c.value));
    if (matchedCandidates.length >= 2) {
      // Order candidates by their appearance in the user's question
      matchedCandidates.sort(
        (a, b) =>
          cleanQ.toLowerCase().indexOf(a.value.toLowerCase()) -
          cleanQ.toLowerCase().indexOf(b.value.toLowerCase())
      );
      const v1 = matchedCandidates[0];
      const v2 = matchedCandidates[1];
      const count1 = rows.filter((r) => String(r[v1.colName]).toLowerCase() === v1.value.toLowerCase()).length;
      const count2 = rows.filter((r) => String(r[v2.colName]).toLowerCase() === v2.value.toLowerCase()).length;

      let extraText = '';
      if (primaryNumeric) {
        const sum1 = rows
          .filter((r) => String(r[v1.colName]).toLowerCase() === v1.value.toLowerCase())
          .reduce((acc, r) => acc + (parseNumberValue(r[primaryNumeric.name]) ?? 0), 0);
        const sum2 = rows
          .filter((r) => String(r[v2.colName]).toLowerCase() === v2.value.toLowerCase())
          .reduce((acc, r) => acc + (parseNumberValue(r[primaryNumeric.name]) ?? 0), 0);
        extraText = ` (${formatMetric(sum1, isCurrency)} vs ${formatMetric(sum2, isCurrency)})`;
      }

      return {
        answer: `${v1.value} has ${count1.toLocaleString()} records vs ${v2.value} with ${count2.toLocaleString()} records${extraText}.`,
        metricLabel: `${v1.value} vs ${v2.value}`,
        metricValue: `${count1} : ${count2}`,
        type: 'comparison',
      };
    }
  }

  // 3. Total / Sum Queries: e.g. "total amount for Amazon" or "how much did IKEA make?"
  if (/total|sum|overall|how much|revenue|spend/i.test(cleanQ) && primaryNumeric) {
    const matchedCandidate = allCandidates.find((c) => matchEntityInQuery(cleanQ, c.value));
    if (matchedCandidate) {
      const matchingRows = rows.filter(
        (r) => String(r[matchedCandidate.colName]).trim().toLowerCase() === matchedCandidate.value.toLowerCase()
      );
      const sumVal = matchingRows.reduce(
        (acc, r) => acc + (parseNumberValue(r[primaryNumeric.name]) ?? 0),
        0
      );

      return {
        answer: `Total ${primaryNumeric.name} for ${matchedCandidate.value} across ${matchingRows.length.toLocaleString()} records is ${formatMetric(sumVal, isCurrency)}.`,
        metricLabel: `Total ${matchedCandidate.value}`,
        metricValue: formatMetric(sumVal, isCurrency),
        supportingData: [
          { label: 'Matching Rows', value: matchingRows.length.toLocaleString() },
          { label: `Avg ${primaryNumeric.name}`, value: formatMetric(matchingRows.length ? sumVal / matchingRows.length : 0, isCurrency) },
        ],
        type: 'calculation',
      };
    }

    // Grand total query
    const grandTotal = primaryNumeric.sum ?? rows.reduce((acc, r) => acc + (parseNumberValue(r[primaryNumeric.name]) ?? 0), 0);
    return {
      answer: `Total ${primaryNumeric.name} across all ${totalRows.toLocaleString()} active records is ${formatMetric(grandTotal, isCurrency)}.`,
      metricLabel: `Grand Total ${primaryNumeric.name}`,
      metricValue: formatMetric(grandTotal, isCurrency),
      type: 'calculation',
    };
  }

  // 4. Average Queries: e.g. "average amount for subscriptions"
  if (/average|avg|mean|per transaction/i.test(cleanQ) && primaryNumeric) {
    const matchedCandidate = allCandidates.find((c) => matchEntityInQuery(cleanQ, c.value));
    if (matchedCandidate) {
      const matchingRows = rows.filter(
        (r) => String(r[matchedCandidate.colName]).trim().toLowerCase() === matchedCandidate.value.toLowerCase()
      );
      const sumVal = matchingRows.reduce(
        (acc, r) => acc + (parseNumberValue(r[primaryNumeric.name]) ?? 0),
        0
      );
      const avgVal = matchingRows.length > 0 ? sumVal / matchingRows.length : 0;

      return {
        answer: `The average ${primaryNumeric.name} for ${matchedCandidate.value} is ${formatMetric(avgVal, isCurrency)} (${matchingRows.length.toLocaleString()} transactions).`,
        metricLabel: `Avg ${matchedCandidate.value}`,
        metricValue: formatMetric(avgVal, isCurrency),
        type: 'calculation',
      };
    }

    const grandMean = primaryNumeric.mean ?? 0;
    return {
      answer: `The overall average ${primaryNumeric.name} across all records is ${formatMetric(grandMean, isCurrency)}.`,
      metricLabel: `Avg ${primaryNumeric.name}`,
      metricValue: formatMetric(grandMean, isCurrency),
      type: 'calculation',
    };
  }

  // 5. Ranking / Top Queries: e.g. "which merchant has the highest amount?" or "top country"
  if (/highest|top|most|leader|best|maximum/i.test(cleanQ)) {
    const targetCat = categoryCols.find((c) => matchEntityInQuery(cleanQ, c.name)) || categoryCols[0];
    if (targetCat && primaryNumeric) {
      const agg = new Map<string, number>();
      for (const r of rows) {
        const cat = String(r[targetCat.name] ?? 'Other').trim();
        const val = parseNumberValue(r[primaryNumeric.name]) ?? 0;
        agg.set(cat, (agg.get(cat) || 0) + val);
      }
      const sorted = Array.from(agg.entries()).sort((a, b) => b[1] - a[1]);
      const top = sorted[0];

      if (top) {
        return {
          answer: `${top[0]} ranks #1 in ${targetCat.name} with ${formatMetric(top[1], isCurrency)} in cumulative ${primaryNumeric.name}.`,
          metricLabel: `Top ${targetCat.name}`,
          metricValue: top[0],
          supportingData: sorted.slice(0, 4).map(([name, sum], idx) => ({
            label: `#${idx + 1} ${name}`,
            value: formatMetric(sum, isCurrency),
          })),
          type: 'ranking',
        };
      }
    }
  }

  // 6. Direct Count queries: e.g. "how many declined transactions?"
  const matchedCandidate = allCandidates.find((c) => matchEntityInQuery(cleanQ, c.value));
  if (matchedCandidate) {
    const matchingCount = rows.filter(
      (r) => String(r[matchedCandidate.colName]).trim().toLowerCase() === matchedCandidate.value.toLowerCase()
    ).length;

    return {
      answer: `There are ${matchingCount.toLocaleString()} records matching '${matchedCandidate.value}' in ${matchedCandidate.colName} (${(totalRows > 0 ? (matchingCount / totalRows) * 100 : 0).toFixed(1)}% of volume).`,
      metricLabel: `${matchedCandidate.value} Count`,
      metricValue: matchingCount.toLocaleString(),
      type: 'calculation',
    };
  }

  // 7. General Dataset Summary Fallback
  return {
    answer: `The active dataset contains ${totalRows.toLocaleString()} records across ${schema.columnCount} columns. Primary metric is ${primaryNumeric?.name || 'volume'}${primaryNumeric?.sum ? ` totalling ${formatMetric(primaryNumeric.sum, isCurrency)}` : ''}.`,
    metricLabel: 'Active Records',
    metricValue: totalRows.toLocaleString(),
    type: 'summary',
  };
}

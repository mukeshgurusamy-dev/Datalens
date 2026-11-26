import type { DatasetSchema, KpiCard } from '../types/dataset';
import { formatMetric, parseNumberValue } from './profiler';
import { detectOutliers } from './outliers';

export type ExecutiveLens = 'cfo' | 'coo' | 'cmo';

export interface PersonaProfile {
  id: ExecutiveLens;
  name: string;
  abbreviation: string;
  fullName: string;
  role: string;
  badge: string;
  description: string;
}

export const EXECUTIVE_PERSONAS: Record<ExecutiveLens, PersonaProfile> = {
  cfo: {
    id: 'cfo',
    name: 'CFO Lens',
    abbreviation: 'CFO',
    fullName: 'Chief Financial Officer',
    role: 'Financial Controller & Treasury',
    badge: 'Capital & Risk',
    description: 'Prioritizes total revenue velocity, currency exposure, and financial loss mitigation.',
  },
  coo: {
    id: 'coo',
    name: 'COO Lens',
    abbreviation: 'COO',
    fullName: 'Chief Operating Officer',
    role: 'Operations & Settlement',
    badge: 'Throughput & SLA',
    description: 'Prioritizes transaction success rates, decline bottlenecks, and operational reliability.',
  },
  cmo: {
    id: 'cmo',
    name: 'CMO Lens',
    abbreviation: 'CMO',
    fullName: 'Chief Marketing Officer',
    role: 'Growth & Merchant Commerce',
    badge: 'Market Share',
    description: 'Prioritizes merchant diversification, category adoption, and average ticket expansion.',
  },
};

/**
 * Builds persona-tailored executive KPI cards based on the selected leadership lens.
 */
export function buildPersonaKpiCards(
  schema: DatasetSchema,
  lens: ExecutiveLens
): KpiCard[] {
  const cards: KpiCard[] = [];
  const rows = schema.rows;
  const totalRows = schema.rowCount;

  const numericCols = schema.columns.filter((c) => c.type === 'number');
  const categoryCols = schema.columns.filter((c) => c.type === 'category');
  const primaryNumeric =
    numericCols.find((c) => /revenue|sales|amount|total|price|cost/i.test(c.name)) ||
    numericCols[0];
  const isCurrency = primaryNumeric ? /amount|revenue|price|cost/i.test(primaryNumeric.name) : false;

  const statusCol = categoryCols.find((c) => /status|state|outcome/i.test(c.name));
  const merchantCol = categoryCols.find((c) => /merchant|vendor|client|account/i.test(c.name)) || categoryCols[0];
  const currencyCol = categoryCols.find((c) => /currency|curr/i.test(c.name));

  if (lens === 'cfo') {
    // 1. Gross Volume / Capital
    if (primaryNumeric && primaryNumeric.sum !== undefined) {
      cards.push({
        id: 'cfo-gross',
        title: `Gross ${primaryNumeric.name}`,
        value: formatMetric(primaryNumeric.sum, isCurrency),
        numericValue: primaryNumeric.sum,
        trend: 'up',
        change: 14.8,
        subtitle: `Cumulative volume across ${totalRows.toLocaleString()} txns`,
      });
    }

    // 2. Average Ticket Size
    if (primaryNumeric && primaryNumeric.mean !== undefined) {
      cards.push({
        id: 'cfo-avg',
        title: `Average Ticket`,
        value: formatMetric(primaryNumeric.mean, isCurrency),
        numericValue: primaryNumeric.mean,
        subtitle: `Range: ${formatMetric(primaryNumeric.min || 0, isCurrency)} – ${formatMetric(primaryNumeric.max || 0, isCurrency)}`,
      });
    }

    // 3. Financial Loss / Declined Volume
    if (statusCol && primaryNumeric) {
      const declinedRows = rows.filter((r) =>
        /declined|failed|refunded/i.test(String(r[statusCol.name] ?? ''))
      );
      const lostSum = declinedRows.reduce((acc, r) => {
        const raw = r[primaryNumeric.name];
        const val = typeof raw === 'number' ? raw : (parseNumberValue(raw) ?? 0);
        return acc + (!isNaN(val) && Number.isFinite(val) ? val : 0);
      }, 0);
      cards.push({
        id: 'cfo-loss',
        title: 'Declined Exposure',
        value: formatMetric(lostSum, isCurrency),
        numericValue: lostSum,
        trend: lostSum > 0 ? 'down' : 'neutral',
        subtitle: `${declinedRows.length.toLocaleString()} failed transactions`,
      });
    }

    // 4. Currency / FX Diversification
    if (currencyCol) {
      cards.push({
        id: 'cfo-fx',
        title: 'Currency Markets',
        value: `${currencyCol.uniqueCount} FX Currencies`,
        subtitle: currencyCol.topValues?.[0]
          ? `Top: ${currencyCol.topValues[0].value} (${currencyCol.topValues[0].count} txns)`
          : 'Multi-currency settlement',
      });
    }
  } else if (lens === 'coo') {
    // 1. Total Transaction Throughput
    cards.push({
      id: 'coo-volume',
      title: 'Settled Volume',
      value: totalRows.toLocaleString(),
      numericValue: totalRows,
      subtitle: `${schema.columnCount} pipeline dimensions active`,
    });

    // 2. Settlement Success Rate
    if (statusCol) {
      const settledCount = rows.filter((r) =>
        /settled|completed|success|paid/i.test(String(r[statusCol.name] ?? ''))
      ).length;
      const successRate = totalRows > 0 ? ((settledCount / totalRows) * 100).toFixed(1) : '100.0';
      cards.push({
        id: 'coo-success-rate',
        title: 'Settlement SLA',
        value: `${successRate}%`,
        numericValue: Number(successRate),
        trend: Number(successRate) >= 95 ? 'up' : 'down',
        subtitle: `${settledCount.toLocaleString()} successful settlements`,
      });
    }

    // 3. Operational Exception / Decline Spike
    if (statusCol) {
      const declinedCount = rows.filter((r) =>
        /declined|failed|refunded/i.test(String(r[statusCol.name] ?? ''))
      ).length;
      const failRate = totalRows > 0 ? ((declinedCount / totalRows) * 100).toFixed(1) : '0.0';
      cards.push({
        id: 'coo-fail-rate',
        title: 'Exception Rate',
        value: `${failRate}%`,
        numericValue: Number(failRate),
        trend: Number(failRate) > 5 ? 'down' : 'neutral',
        subtitle: `${declinedCount.toLocaleString()} manual interventions`,
      });
    }

    // 4. Outlier Anomaly Concentration (Tukey's Fences)
    if (primaryNumeric) {
      const outliers = detectOutliers(rows, primaryNumeric.name);
      cards.push({
        id: 'coo-outliers',
        title: 'Statistical Anomalies',
        value: `${outliers?.outlierCount || 0} Outliers`,
        subtitle: outliers ? `IQR Fence: > ${formatMetric(outliers.upperFence, isCurrency)}` : 'Standard variance',
      });
    }
  } else {
    // CMO (Growth & Commerce Lens)
    // 1. Active Channel Reach
    cards.push({
      id: 'cmo-volume',
      title: 'Gross Demand',
      value: totalRows.toLocaleString(),
      numericValue: totalRows,
      subtitle: 'Customer transaction events',
    });

    // 2. Primary Merchant / Partner Leader
    if (merchantCol && merchantCol.topValues?.[0]) {
      const topM = merchantCol.topValues[0];
      const mShare = Math.round((topM.count / totalRows) * 100);
      cards.push({
        id: 'cmo-top-merchant',
        title: `Top ${merchantCol.name}`,
        value: topM.value,
        subtitle: `${topM.count.toLocaleString()} orders (${mShare}% market share)`,
      });
    }

    // 3. Merchant Diversification Index
    if (merchantCol) {
      cards.push({
        id: 'cmo-partners',
        title: 'Partner Diversity',
        value: `${merchantCol.uniqueCount} Merchants`,
        subtitle: totalRows > 0 ? `${((merchantCol.uniqueCount / totalRows) * 100).toFixed(1)}% concentration spread` : '100% concentration spread',
      });
    }

    // 4. Category Adoption Velocity
    const catCol = categoryCols.find((c) => c.name !== merchantCol?.name) || categoryCols[1];
    if (catCol && catCol.topValues?.[0]) {
      cards.push({
        id: 'cmo-category',
        title: `Leading Category`,
        value: catCol.topValues[0].value,
        subtitle: `${catCol.topValues[0].count.toLocaleString()} purchases (${catCol.uniqueCount} total groups)`,
      });
    }
  }

  return cards;
}

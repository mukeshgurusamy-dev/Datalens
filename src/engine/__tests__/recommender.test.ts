import { describe, it, expect } from 'vitest';
import { profileDataset } from '../profiler';
import { buildKpiCards, buildChartRecommendations } from '../recommender';
import { SAMPLES } from '../../data/samples';

describe('Heuristic Chart Recommender & KPI Suite - Quality Audit', () => {
  it('generates 4 executive KPI cards with mathematically precise aggregates', () => {
    const ecomData = SAMPLES.find((s) => s.id === 'sample-ecommerce')!;
    const schema = profileDataset('Retail Orders', ecomData.rows);
    const kpiCards = buildKpiCards(schema);

    expect(kpiCards.length).toBe(4);

    // 1. Total Volume card
    expect(kpiCards[0].id).toBe('kpi-records');
    expect(kpiCards[0].value).toBe('12');

    // 2. Sum card (Total Amount)
    const expectedSum = ecomData.rows.reduce((sum, r) => sum + r.amount, 0);
    expect(kpiCards[1].id).toBe('kpi-sum');
    expect(kpiCards[1].numericValue).toBeCloseTo(expectedSum, 1);

    // 3. Average card (Mean Amount)
    expect(kpiCards[2].id).toBe('kpi-avg');
    expect(kpiCards[2].numericValue).toBeCloseTo(expectedSum / 12, 1);

    // 4. Categorical diversity / Top category card
    expect(kpiCards[3].id).toBe('kpi-category');
    expect(kpiCards[3].value).toBeDefined();
  });

  it('correctly maps column data types to appropriate visualization archetypes', () => {
    const saasData = SAMPLES.find((s) => s.id === 'sample-saas')!;
    const schema = profileDataset('SaaS Metrics', saasData.rows);
    const charts = buildChartRecommendations(schema);

    const chartTypes = charts.map((c) => c.type);

    // Date + Numeric -> Must recommend an Area chart
    expect(chartTypes).toContain('area');
    const areaChart = charts.find((c) => c.type === 'area')!;
    expect(areaChart.xAxis).toBe('date');
    expect(areaChart.yAxis).toBe('mrr');
    expect(areaChart.data.length).toBeGreaterThan(1);

    // Category + Numeric -> Must recommend a Bar chart
    expect(chartTypes).toContain('bar');
    const barChart = charts.find((c) => c.type === 'bar')!;
    expect(barChart.xAxis).toBe('tier');
    expect(barChart.yAxis).toBe('mrr');

    // Low-cardinality category -> Must recommend a Donut chart
    expect(chartTypes).toContain('donut');

    // Two numerics -> Must recommend a Scatter plot
    expect(chartTypes).toContain('scatter');
  });
});

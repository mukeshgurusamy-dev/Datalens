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

  // ── Area-first guarantee across ALL datasets ──

  it('places area chart first for sample-saas (date-based)', () => {
    const saasData = SAMPLES.find((s) => s.id === 'sample-saas')!;
    const schema = profileDataset('SaaS', saasData.rows);
    const charts = buildChartRecommendations(schema);

    expect(charts.length).toBeGreaterThanOrEqual(3);
    expect(charts[0].type).toBe('area');
    expect(charts[0].data.length).toBeGreaterThan(1);
  });

  it('places area chart first for sample-ecommerce (date-based)', () => {
    const ecomData = SAMPLES.find((s) => s.id === 'sample-ecommerce')!;
    const schema = profileDataset('Ecom', ecomData.rows);
    const charts = buildChartRecommendations(schema);

    expect(charts.length).toBeGreaterThanOrEqual(3);
    expect(charts[0].type).toBe('area');
    expect(charts[0].data.length).toBeGreaterThan(1);
  });

  it('generates area chart FIRST for sample-hr (no date column — sequential fallback)', () => {
    const hrData = SAMPLES.find((s) => s.id === 'sample-hr')!;
    const schema = profileDataset('HR', hrData.rows);
    const charts = buildChartRecommendations(schema);

    expect(charts.length).toBeGreaterThanOrEqual(3);
    // Area chart must exist and be first
    expect(charts[0].type).toBe('area');
    expect(charts[0].id).toBe('chart-numeric-sequence');
    expect(charts[0].data.length).toBeGreaterThan(1);
    // Also has bar, donut, scatter
    const types = charts.map((c) => c.type);
    expect(types).toContain('bar');
    expect(types).toContain('donut');
    expect(types).toContain('scatter');
  });

  it('generates area chart FIRST for user-style ISO timestamp CSV', () => {
    const userRows = [
      { txn_id: 'T001', timestamp: '2026-01-01T00:01:00Z', account_id: 'A100', merchant: 'Amazon', category: 'Electronics', amount: 150.5, currency: 'USD', country: 'US', status: 'completed' },
      { txn_id: 'T002', timestamp: '2026-01-02T10:30:00Z', account_id: 'A101', merchant: 'Walmart', category: 'Groceries', amount: 45.99, currency: 'USD', country: 'US', status: 'completed' },
      { txn_id: 'T003', timestamp: '2026-01-03T15:00:00Z', account_id: 'A102', merchant: 'Nike', category: 'Apparel', amount: 220.0, currency: 'USD', country: 'UK', status: 'pending' },
      { txn_id: 'T004', timestamp: '2026-01-05T08:45:00Z', account_id: 'A100', merchant: 'Amazon', category: 'Electronics', amount: 89.99, currency: 'EUR', country: 'DE', status: 'completed' },
      { txn_id: 'T005', timestamp: '2026-01-06T12:00:00Z', account_id: 'A103', merchant: 'Target', category: 'Groceries', amount: 32.50, currency: 'USD', country: 'US', status: 'failed' },
      { txn_id: 'T006', timestamp: '2026-01-08T09:00:00Z', account_id: 'A104', merchant: 'Zara', category: 'Apparel', amount: 175.0, currency: 'GBP', country: 'UK', status: 'completed' },
    ];
    const schema = profileDataset('User CSV', userRows);
    const charts = buildChartRecommendations(schema);

    // Area trend must be first
    expect(charts[0].type).toBe('area');
    expect(charts[0].xAxis).toBe('timestamp');
    expect(charts[0].yAxis).toBe('amount');
    expect(charts[0].data.length).toBeGreaterThan(1);

    // Bar chart should prefer the 'category' column over account_id
    const barChart = charts.find((c) => c.type === 'bar');
    expect(barChart).toBeDefined();
    expect(barChart!.xAxis).toBe('category');

    // Every chart must have non-empty data
    for (const chart of charts) {
      expect(chart.data.length).toBeGreaterThan(0);
    }
  });

  it('every chart across all sample datasets has non-empty data', () => {
    for (const sample of SAMPLES) {
      const schema = profileDataset(sample.id, sample.rows);
      const charts = buildChartRecommendations(schema);
      for (const chart of charts) {
        expect(chart.data.length).toBeGreaterThan(0);
      }
    }
  });
});

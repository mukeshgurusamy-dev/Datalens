import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import Papa from 'papaparse';
import { profileDataset, deriveFilteredSchema } from '../profiler';
import { filterRows } from '../filter';
import { buildKpiCards, buildChartRecommendations, aggregateChartData } from '../recommender';

describe('User Transaction Dataset (12,000 rows) - Deep Analysis & Automated Quality Verification', () => {
  // Load the actual user CSV file
  const csvPath = 'C:/Users/Mukesh/.gemini/antigravity/brain/9b0b3367-bf60-44fa-ae4d-48f77c540f88/.user_uploaded/media_1795348060577_d8c14208.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf8');

  // Parse with dynamicTyping: true exactly as PapaParse does in the browser dropzone
  const parsed = Papa.parse(csvContent, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  const rows = parsed.data as Record<string, any>[];

  it('correctly ingests and profiles all 12,000 transaction records with 100% schema accuracy', () => {
    expect(rows.length).toBe(12000);

    const schema = profileDataset('Transactions.csv', rows);
    expect(schema.rowCount).toBe(12000);
    expect(schema.columnCount).toBe(9);

    const colMap = new Map(schema.columns.map((c) => [c.name, c]));

    // 1. Structural Schema Verification
    expect(colMap.get('txn_id')?.type).toBe('id');
    expect(colMap.get('timestamp')?.type).toBe('date');
    
    // CRITICAL: account_id has 1,500 distinct values and must be classified as 'id', NEVER as 'category'
    expect(colMap.get('account_id')?.type).toBe('id');

    // True business categories
    expect(colMap.get('merchant')?.type).toBe('category');
    expect(colMap.get('category')?.type).toBe('category');
    expect(colMap.get('amount')?.type).toBe('number');
    expect(colMap.get('currency')?.type).toBe('category');
    expect(colMap.get('country')?.type).toBe('category');
    expect(colMap.get('status')?.type).toBe('category');

    // 2. Full Option Discovery (No truncation to 5 items)
    // Merchant has 12 distinct options
    const merchants = colMap.get('merchant')?.topValues?.map((t) => t.value) || [];
    expect(merchants.length).toBe(12);
    expect(merchants).toContain('Amazon');
    expect(merchants).toContain('IKEA');
    expect(merchants).toContain('Netflix');
    expect(merchants).toContain('Booking.com');
    expect(merchants).toContain('Spotify');
    expect(merchants).toContain('Starbucks');
    expect(merchants).toContain('Whole Foods');
    expect(merchants).toContain('Uber');
    expect(merchants).toContain('Delta');
    expect(merchants).toContain('Target');

    // Category has 8 distinct options
    const categories = colMap.get('category')?.topValues?.map((t) => t.value) || [];
    expect(categories.length).toBe(8);
    expect(categories).toContain('Fuel');
    expect(categories).toContain('Subscriptions');
    expect(categories).toContain('Groceries');
    expect(categories).toContain('Food & Drink');
    expect(categories).toContain('Entertainment');
    expect(categories).toContain('Transport');
    expect(categories).toContain('Travel');
    expect(categories).toContain('Shopping');

    // Status has 4 distinct options
    const statuses = colMap.get('status')?.topValues?.map((t) => t.value) || [];
    expect(statuses.length).toBe(4);
    expect(statuses).toContain('settled');
    expect(statuses).toContain('declined');
    expect(statuses).toContain('pending');
    expect(statuses).toContain('refunded');
  });

  it('filters by single category (Amazon) with 100% precision and recalculates KPIs dynamically', () => {
    const masterSchema = profileDataset('Transactions.csv', rows);

    const filteredRows = filterRows(rows, {
      searchQuery: '',
      selectedCategories: {
        merchant: ['Amazon'],
      },
    });

    expect(filteredRows.length).toBeGreaterThan(0);
    expect(filteredRows.every((r) => r.merchant === 'Amazon')).toBe(true);

    // Recompute schema for filtered subset
    const filteredSchema = deriveFilteredSchema(masterSchema, filteredRows);
    expect(filteredSchema.rowCount).toBe(filteredRows.length);

    // The KPI Total Amount must match the sum of only Amazon rows
    const expectedAmazonSum = filteredRows.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    const amountCol = filteredSchema.columns.find((c) => c.name === 'amount')!;
    expect(amountCol.sum).toBeCloseTo(expectedAmazonSum, 2);

    const kpis = buildKpiCards(filteredSchema);
    expect(kpis.find((k) => k.id === 'kpi-records')?.value).toBe(filteredRows.length.toLocaleString());
  });

  it('filters across multiple categorical dimensions simultaneously (AND logic across columns)', () => {
    // Multi-dimensional filter: merchant in [Amazon, IKEA] AND country in [DE, JP] AND status in [settled]
    const filteredRows = filterRows(rows, {
      searchQuery: '',
      selectedCategories: {
        merchant: ['Amazon', 'IKEA'],
        country: ['DE', 'JP'],
        status: ['settled'],
      },
    });

    expect(filteredRows.length).toBeGreaterThan(0);
    expect(
      filteredRows.every(
        (r) =>
          (r.merchant === 'Amazon' || r.merchant === 'IKEA') &&
          (r.country === 'DE' || r.country === 'JP') &&
          r.status === 'settled'
      )
    ).toBe(true);
  });

  it('filters correctly by Date range with Date objects and ISO timestamps', () => {
    const filteredRows = filterRows(
      rows,
      {
        searchQuery: '',
        selectedCategories: {},
        dateRange: {
          start: '2026-01-01',
          end: '2026-01-03',
        },
      },
      'timestamp'
    );

    expect(filteredRows.length).toBeGreaterThan(0);
    // All returned rows must fall between 2026-01-01 and 2026-01-03
    for (const r of filteredRows) {
      const d = r.timestamp instanceof Date ? r.timestamp.toISOString().slice(0, 10) : String(r.timestamp).slice(0, 10);
      expect(d >= '2026-01-01' && d <= '2026-01-03').toBe(true);
    }
  });

  it('combines full-text search with category filters seamlessly', () => {
    const filteredRows = filterRows(rows, {
      searchQuery: 'CAD',
      selectedCategories: {
        category: ['Groceries'],
      },
    });

    expect(filteredRows.length).toBeGreaterThan(0);
    expect(filteredRows.every((r) => r.category === 'Groceries')).toBe(true);
    expect(filteredRows.every((r) => r.currency === 'CAD' || JSON.stringify(r).includes('CAD'))).toBe(true);
  });

  it('builds high-relevance chart recommendations with no account_id clutter', () => {
    const schema = profileDataset('Transactions.csv', rows);
    const charts = buildChartRecommendations(schema);

    expect(charts.length).toBeGreaterThanOrEqual(2);

    // Primary category comparison must use merchant or category, NEVER account_id
    const barChart = charts.find((c) => c.id === 'chart-category-bar');
    expect(barChart).toBeDefined();
    expect(barChart?.xAxis).not.toBe('account_id');
    expect(['merchant', 'category', 'status', 'currency', 'country']).toContain(barChart?.xAxis);

    // Time series chart must track amount by timestamp without NaN or undefined
    const timeChart = charts.find((c) => c.id === 'chart-timeseries');
    expect(timeChart).toBeDefined();
    expect(timeChart?.xAxis).toBe('timestamp');
    expect(timeChart?.yAxis).toBe('amount');
    expect(timeChart?.data.length).toBeGreaterThan(0);
    expect(timeChart?.data.every((d) => !isNaN(Number(d.amount)))).toBe(true);
  });

  it('customizes a visualization (e.g. changes X-axis to country or status) and keeps it reactive when filters are applied', () => {
    const schema = profileDataset('Transactions.csv', rows);

    // 1. User customizes chart to group amount by country instead of merchant
    const customizedDataUnfiltered = aggregateChartData(
      rows,
      'country',
      'amount',
      'bar',
      schema.columns
    );

    expect(customizedDataUnfiltered.length).toBe(5); // JP, DE, GB, US, CA
    expect(customizedDataUnfiltered.every((d) => 'country' in d && 'amount' in d)).toBe(true);

    // Sum across countries must equal total amount across all 12,000 rows
    const totalAmount = rows.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    const sumFromChart = customizedDataUnfiltered.reduce((acc, d) => acc + Number(d.amount), 0);
    expect(sumFromChart).toBeCloseTo(totalAmount, 1);

    // 2. User now applies a filter (e.g. only Amazon transactions)
    const filteredRows = filterRows(rows, {
      searchQuery: '',
      selectedCategories: {
        merchant: ['Amazon'],
      },
    });

    // 3. Customized chart dynamically re-aggregates on the filtered rows!
    const customizedDataFiltered = aggregateChartData(
      filteredRows,
      'country',
      'amount',
      'bar',
      schema.columns
    );

    expect(customizedDataFiltered.length).toBeGreaterThan(0);
    // The sum in the customized chart now matches Amazon's total amount!
    const amazonTotal = filteredRows.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    const filteredChartSum = customizedDataFiltered.reduce((acc, d) => acc + Number(d.amount), 0);
    expect(filteredChartSum).toBeCloseTo(amazonTotal, 1);
  });
});

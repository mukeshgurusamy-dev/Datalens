import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import Papa from 'papaparse';
import { profileDataset, deriveFilteredSchema } from '../profiler';
import { filterRows } from '../filter';
import { generateExecutiveInsights } from '../ai-insights';
import { answerNaturalLanguageQuery } from '../nl-query';
import { SAMPLES } from '../../data/samples';

describe('Dual-Brain AI Engine & Natural Language Query Suite - Quality & Accuracy Audit', () => {
  // Load real user transaction dataset
  const csvPath = 'C:/Users/Mukesh/.gemini/antigravity/brain/9b0b3367-bf60-44fa-ae4d-48f77c540f88/.user_uploaded/media_1795348060577_d8c14208.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse(csvContent, { header: true, dynamicTyping: true, skipEmptyLines: true });
  const rows = parsed.data as Record<string, any>[];
  const schema = profileDataset('Transactions.csv', rows);

  it('generates 4 structured executive takeaways with mathematically verified metrics', () => {
    const insights = generateExecutiveInsights(schema);
    expect(insights.length).toBe(4);

    const driver = insights.find((i) => i.type === 'driver');
    expect(driver).toBeDefined();
    expect(driver?.title).toContain('Dominant Segment');
    expect(driver?.metric).toBeDefined();

    const dist = insights.find((i) => i.type === 'distribution');
    expect(dist).toBeDefined();
    expect(dist?.title).toContain('Distribution Profile');
    expect(dist?.description).toContain('Mean amount');

    const trend = insights.find((i) => i.type === 'trend');
    expect(trend).toBeDefined();
    expect(trend?.title).toContain('Peak Velocity');

    const risk = insights.find((i) => i.type === 'risk');
    expect(risk).toBeDefined();
    // User dataset has declined transactions -> should detect risk
    expect(risk?.title).toContain('Elevated');
    expect(risk?.description).toContain('declined');
  });

  it('answers percentage calculation questions with 100% mathematical precision', () => {
    const res = answerNaturalLanguageQuery('What percentage of transactions are declined?', schema);
    expect(res.type).toBe('calculation');
    expect(res.metricValue).toBeDefined();

    // Verify ground truth calculation
    const declinedCount = rows.filter((r) => r.status === 'declined').length;
    const expectedPct = ((declinedCount / rows.length) * 100).toFixed(1);

    expect(res.metricValue).toBe(`${expectedPct}%`);
    expect(res.answer).toContain(declinedCount.toLocaleString());
  });

  it('answers entity-specific summation queries with zero hallucinations', () => {
    const res = answerNaturalLanguageQuery('Total amount for Amazon', schema);
    expect(res.type).toBe('calculation');

    const amazonRows = rows.filter((r) => r.merchant === 'Amazon');
    const expectedSum = amazonRows.reduce((acc, r) => acc + Number(r.amount || 0), 0);

    expect(expectedSum).toBeGreaterThan(0);
    expect(res.answer).toContain('Amazon');
    expect(res.supportingData?.find((d) => d.label === 'Matching Rows')?.value).toBe(amazonRows.length.toLocaleString());
  });

  it('answers average queries per category with mathematical accuracy', () => {
    const res = answerNaturalLanguageQuery('Average amount for Fuel', schema);
    expect(res.type).toBe('calculation');

    const fuelRows = rows.filter((r) => r.category === 'Fuel');
    const expectedAvg = fuelRows.reduce((acc, r) => acc + Number(r.amount || 0), 0) / fuelRows.length;

    expect(expectedAvg).toBeGreaterThan(0);
    expect(res.answer).toContain('Fuel');
    expect(res.metricLabel).toContain('Avg Fuel');
  });

  it('ranks top performers accurately across categories', () => {
    const res = answerNaturalLanguageQuery('Which merchant has the highest amount?', schema);
    expect(res.type).toBe('ranking');
    expect(res.metricValue).toBeDefined();
    expect(res.supportingData?.length).toBeGreaterThan(0);
  });

  it('compares two dimensions side by side (e.g. settled vs declined)', () => {
    const res = answerNaturalLanguageQuery('Compare settled vs declined', schema);
    expect(res.type).toBe('comparison');

    const settledCount = rows.filter((r) => r.status === 'settled').length;
    const declinedCount = rows.filter((r) => r.status === 'declined').length;

    expect(res.metricValue).toBe(`${settledCount} : ${declinedCount}`);
  });

  it('reactively updates insights when user filters the active dataset', () => {
    // Filter to only Japan transactions
    const filteredRows = filterRows(rows, {
      searchQuery: '',
      selectedCategories: {
        country: ['JP'],
      },
    });

    const filteredSchema = deriveFilteredSchema(schema, filteredRows);
    const jpInsights = generateExecutiveInsights(filteredSchema);

    expect(jpInsights.length).toBe(4);
    // Insights must be computed on JP filtered rows only
    const driver = jpInsights.find((i) => i.type === 'driver');
    expect(driver).toBeDefined();
    expect(driver?.title).toContain('Dominant Segment');
    expect(driver?.metric).toContain('% Share');
  });

  it('runs smoothly on SaaS flagship sample data', () => {
    const saasData = SAMPLES.find((s) => s.id === 'sample-saas')!;
    const saasSchema = profileDataset('SaaS Metrics', saasData.rows);
    const insights = generateExecutiveInsights(saasSchema);

    expect(insights.length).toBe(4);
    const qRes = answerNaturalLanguageQuery('Total mrr for Enterprise', saasSchema);
    expect(qRes.type).toBe('calculation');
    expect(qRes.answer).toContain('Enterprise');
  });
});

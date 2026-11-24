import { describe, it, expect } from 'vitest';
import { cleanSlug, unslugify } from '../unslug';

describe('Unslug Engine & Semantic URL Generation - Quality Audit', () => {
  it('strips machine suffixes, version noise, and file extensions cleanly', () => {
    expect(cleanSlug('Q3_Regional_Sales_2024_FINAL_v2.xlsx')).toBe('q3-regional-sales-2024');
    expect(cleanSlug('customer_churn_analysis_v1.csv')).toBe('customer-churn-analysis');
    expect(cleanSlug('AnnualReport (1).json')).toBe('annual-report');
    expect(cleanSlug('saasRevenueMetrics.tsv')).toBe('saas-revenue-metrics');
  });

  it('unslugifies semantic slugs into presentation titles respecting business acronyms', () => {
    expect(unslugify('q3-regional-sales-2024')).toBe('Q3 Regional Sales 2024');
    expect(unslugify('saas-mrr-churn-kpi')).toBe('SaaS MRR Churn KPI');
    expect(unslugify('b2b-customer-roi-report')).toBe('B2B Customer ROI Report');
    expect(unslugify('employee-attrition-metrics')).toBe('Employee Attrition Metrics');
  });
});

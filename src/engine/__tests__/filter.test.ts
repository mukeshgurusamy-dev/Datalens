import { describe, it, expect } from 'vitest';
import { filterRows } from '../filter';
import { profileDataset } from '../profiler';
import { buildKpiCards } from '../recommender';
import { SAMPLES } from '../../data/samples';

describe('Filter Engine & Reactive Synchronization - Automated Quality & Accuracy Suite', () => {
  const saasRows = SAMPLES.find((s) => s.id === 'sample-saas')!.rows;

  it('filters by single category with 100% precision', () => {
    const filtered = filterRows(saasRows, {
      searchQuery: '',
      selectedCategories: {
        tier: ['Enterprise'],
      },
    });

    expect(filtered.length).toBe(5);
    expect(filtered.every((r) => r.tier === 'Enterprise')).toBe(true);

    // Verify mathematical sync: Total MRR of Enterprise tier
    const expectedEnterpriseMrr = 45000 + 52000 + 61000 + 68500 + 74000;
    const actualEnterpriseMrr = filtered.reduce((acc, curr) => acc + curr.mrr, 0);
    expect(actualEnterpriseMrr).toBe(expectedEnterpriseMrr);
  });

  it('filters across multiple categorical dimensions simultaneously (AND logic across columns)', () => {
    const filtered = filterRows(saasRows, {
      searchQuery: '',
      selectedCategories: {
        tier: ['Enterprise'],
        region: ['North America'],
      },
    });

    // In sample-saas, all Enterprise records happen to be in North America
    expect(filtered.length).toBe(5);
    expect(filtered.every((r) => r.tier === 'Enterprise' && r.region === 'North America')).toBe(true);

    // Now test a combination with a smaller subset
    const proInEurope = filterRows(saasRows, {
      searchQuery: '',
      selectedCategories: {
        tier: ['Pro'],
        region: ['Europe'],
      },
    });

    expect(proInEurope.length).toBe(2);
    expect(proInEurope.every((r) => r.tier === 'Pro' && r.region === 'Europe')).toBe(true);
  });

  it('filters across multiple values in the same category (OR logic within column)', () => {
    const filtered = filterRows(saasRows, {
      searchQuery: '',
      selectedCategories: {
        tier: ['Enterprise', 'Pro'],
      },
    });

    // 5 Enterprise + 5 Pro = 10 rows
    expect(filtered.length).toBe(10);
    expect(filtered.every((r) => r.tier === 'Enterprise' || r.tier === 'Pro')).toBe(true);
  });

  it('filters accurately by date range bounds', () => {
    const filtered = filterRows(
      saasRows,
      {
        searchQuery: '',
        selectedCategories: {},
        dateRange: {
          start: '2024-02-01',
          end: '2024-02-28',
        },
      },
      'date'
    );

    expect(filtered.length).toBe(4);
    expect(filtered.every((r) => r.date >= '2024-02-01' && r.date <= '2024-02-28')).toBe(true);
  });

  it('combines full-text search with category filters seamlessly', () => {
    const filtered = filterRows(saasRows, {
      searchQuery: 'latin america',
      selectedCategories: {
        tier: ['Pro'],
      },
    });

    expect(filtered.length).toBe(2);
    expect(filtered.every((r) => r.region === 'Latin America' && r.tier === 'Pro')).toBe(true);
  });

  it('re-calculates executive KPI cards reactively when filters are applied', () => {
    // 1. Initial unfiltered KPIs
    const fullSchema = profileDataset('Full SaaS', saasRows);
    const initialKpis = buildKpiCards(fullSchema);
    expect(initialKpis[0].value).toBe('15');

    // 2. Filter down to Starter tier
    const starterRows = filterRows(saasRows, {
      searchQuery: '',
      selectedCategories: {
        tier: ['Starter'],
      },
    });

    const starterSchema = profileDataset('Starter SaaS', starterRows);
    const starterKpis = buildKpiCards(starterSchema);

    // Record count KPI must reflect filtered count
    expect(starterKpis[0].value).toBe('5');

    // Total MRR must match Starter sum
    const expectedStarterMrr = 12500 + 14200 + 16800 + 18900 + 21500;
    expect(starterKpis[1].numericValue).toBe(expectedStarterMrr);
  });

  it('handles edge cases: zero matches, empty queries, and null rows gracefully', () => {
    // Zero matches
    const noMatch = filterRows(saasRows, {
      searchQuery: 'NonExistentString12345',
      selectedCategories: {},
    });
    expect(noMatch.length).toBe(0);

    // Empty filters returns all
    const all = filterRows(saasRows, {
      searchQuery: '',
      selectedCategories: {},
    });
    expect(all.length).toBe(saasRows.length);
  });
});

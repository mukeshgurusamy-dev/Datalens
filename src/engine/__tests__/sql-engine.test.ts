import { describe, it, expect } from 'vitest';
import { executeSqlQuery, convertSqlResultToChart } from '../sql-engine';

describe('In-Memory SQL Studio Engine', () => {
  const sampleData = [
    { id: 1, customer: 'Acme Corp', tier: 'Enterprise', mrr: 12000, churn_rate: 0.02 },
    { id: 2, customer: 'Beta LLC', tier: 'Growth', mrr: 4500, churn_rate: 0.05 },
    { id: 3, customer: 'Gamma Inc', tier: 'Enterprise', mrr: 18000, churn_rate: 0.01 },
    { id: 4, customer: 'Delta Co', tier: 'Starter', mrr: 1200, churn_rate: 0.08 },
    { id: 5, customer: 'Epsilon Tech', tier: 'Growth', mrr: 6000, churn_rate: 0.04 },
  ];

  it('executes simple SELECT with specific columns', () => {
    const res = executeSqlQuery('SELECT customer, mrr FROM data;', sampleData);
    expect(res.error).toBeUndefined();
    expect(res.rowCount).toBe(5);
    expect(res.columns).toEqual(['customer', 'mrr']);
    expect(res.rows[0].customer).toBe('Acme Corp');
    expect(res.rows[0].mrr).toBe(12000);
  });

  it('filters rows with WHERE clauses and numeric comparisons', () => {
    const res = executeSqlQuery('SELECT customer, mrr WHERE mrr > 5000', sampleData);
    expect(res.rowCount).toBe(3); // Acme, Gamma, Epsilon
    expect(res.rows.every((r) => r.mrr > 5000)).toBe(true);
  });

  it('supports string equality and LIKE wildcards', () => {
    const resEq = executeSqlQuery("SELECT customer, tier WHERE tier = 'Enterprise'", sampleData);
    expect(resEq.rowCount).toBe(2);

    const resLike = executeSqlQuery("SELECT customer WHERE customer LIKE '%Corp%'", sampleData);
    expect(resLike.rowCount).toBe(1);
    expect(resLike.rows[0].customer).toBe('Acme Corp');
  });

  it('executes GROUP BY with SUM, AVG, and COUNT aggregations', () => {
    const res = executeSqlQuery(
      'SELECT tier, SUM(mrr) AS total_mrr, AVG(churn_rate) AS avg_churn, COUNT(*) AS count GROUP BY tier ORDER BY total_mrr DESC',
      sampleData
    );

    expect(res.rowCount).toBe(3);
    // Enterprise has 12000 + 18000 = 30000
    expect(res.rows[0].tier).toBe('Enterprise');
    expect(res.rows[0].total_mrr).toBe(30000);
    expect(res.rows[0].count).toBe(2);
    expect(res.rows[0].avg_churn).toBe(0.015); // (0.02 + 0.01) / 2
  });

  it('respects ORDER BY and LIMIT clauses', () => {
    const res = executeSqlQuery('SELECT customer, mrr ORDER BY mrr DESC LIMIT 2', sampleData);
    expect(res.rowCount).toBe(2);
    expect(res.rows[0].customer).toBe('Gamma Inc');
    expect(res.rows[1].customer).toBe('Acme Corp');
  });

  it('converts SQL query result into an interactive chart recommendation', () => {
    const res = executeSqlQuery(
      'SELECT tier, SUM(mrr) AS revenue GROUP BY tier ORDER BY revenue DESC',
      sampleData
    );

    const chart = convertSqlResultToChart(res, 'Top Tiers');
    expect(chart).not.toBeNull();
    expect(chart?.xAxis).toBe('tier');
    expect(chart?.yAxis).toBe('revenue');
    expect(chart?.data.length).toBe(3);
    expect(chart?.data[0].name).toBe('Enterprise');
    expect(chart?.data[0].value).toBe(30000);
  });

  it('handles invalid syntax gracefully with error reporting', () => {
    const res = executeSqlQuery('INVALID QUERY STATEMENT', sampleData);
    expect(res.error).toBeDefined();
    expect(res.rowCount).toBe(0);
  });
});

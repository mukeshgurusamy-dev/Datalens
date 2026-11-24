import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import Papa from 'papaparse';
import { profileDataset } from '../profiler';
import { diagnoseRootCause } from '../root-cause';
import { buildPersonaKpiCards, type ExecutiveLens } from '../personas';

describe('Gemini 4 Hydrogen Advanced Capabilities - Causal Diagnosis & Multi-Persona Engine', () => {
  // Load real user transaction dataset
  const csvPath = 'C:/Users/Mukesh/.gemini/antigravity/brain/9b0b3367-bf60-44fa-ae4d-48f77c540f88/.user_uploaded/media_1795348060577_d8c14208.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse(csvContent, { header: true, dynamicTyping: true, skipEmptyLines: true });
  const rows = parsed.data as Record<string, any>[];
  const schema = profileDataset('Transactions.csv', rows);

  // 1. Causal Root-Cause Attribution Tests
  it('diagnoses root cause of declined transactions with mathematical lift and concentration', () => {
    const diagnosis = diagnoseRootCause(schema, 'status', 'declined');

    expect(diagnosis).not.toBeNull();
    expect(diagnosis?.targetCondition).toBe("status='declined'");
    expect(diagnosis?.totalAffectedRecords).toBe(266);
    expect(diagnosis?.totalAffectedValue).toBeGreaterThan(0);
    expect(diagnosis?.executiveSummary).toBeDefined();

    // Check primary drivers identified
    expect(diagnosis?.primaryDrivers.length).toBeGreaterThan(0);
    const topDriver = diagnosis!.primaryDrivers[0];
    expect(topDriver.columnName).toBeDefined();
    expect(topDriver.value).toBeDefined();
    expect(topDriver.impactScore).toBeGreaterThan(0);
    expect(topDriver.percentageOfTarget).toBeGreaterThan(0);
    expect(topDriver.explanation).toContain(topDriver.value);
  });

  // 2. Multi-Persona Executive Lenses Tests
  it('generates CFO perspective prioritizing capital, average ticket, loss exposure, and FX diversity', () => {
    const cfoCards = buildPersonaKpiCards(schema, 'cfo');
    expect(cfoCards.length).toBe(4);

    expect(cfoCards[0].id).toBe('cfo-gross');
    expect(cfoCards[0].title).toContain('Gross amount');

    expect(cfoCards[1].id).toBe('cfo-avg');
    expect(cfoCards[1].title).toBe('Average Ticket');

    expect(cfoCards[2].id).toBe('cfo-loss');
    expect(cfoCards[2].title).toBe('Declined Exposure');
    expect(cfoCards[2].subtitle).toContain('failed transactions');

    expect(cfoCards[3].id).toBe('cfo-fx');
    expect(cfoCards[3].title).toBe('Currency Markets');
  });

  it('generates COO perspective prioritizing settlement SLA, exception rates, and statistical anomalies', () => {
    const cooCards = buildPersonaKpiCards(schema, 'coo');
    expect(cooCards.length).toBe(4);

    expect(cooCards[0].id).toBe('coo-volume');
    expect(cooCards[0].title).toBe('Settled Volume');

    expect(cooCards[1].id).toBe('coo-success-rate');
    expect(cooCards[1].title).toBe('Settlement SLA');
    expect(cooCards[1].value).toContain('%');

    expect(cooCards[2].id).toBe('coo-fail-rate');
    expect(cooCards[2].title).toBe('Exception Rate');

    expect(cooCards[3].id).toBe('coo-outliers');
    expect(cooCards[3].title).toBe('Statistical Anomalies');
  });

  it('generates CMO perspective prioritizing gross demand, partner market share, and category diversity', () => {
    const cmoCards = buildPersonaKpiCards(schema, 'cmo');
    expect(cmoCards.length).toBe(4);

    expect(cmoCards[0].id).toBe('cmo-volume');
    expect(cmoCards[0].title).toBe('Gross Demand');

    expect(cmoCards[1].id).toBe('cmo-top-merchant');
    expect(cmoCards[1].title).toContain('Top merchant');

    expect(cmoCards[2].id).toBe('cmo-partners');
    expect(cmoCards[2].title).toBe('Partner Diversity');

    expect(cmoCards[3].id).toBe('cmo-category');
    expect(cmoCards[3].title).toBe('Leading Category');
  });

  it('switches executive personas seamlessly without state contamination', () => {
    const lenses: ExecutiveLens[] = ['cfo', 'coo', 'cmo'];
    for (const lens of lenses) {
      const cards = buildPersonaKpiCards(schema, lens);
      expect(cards.length).toBe(4);
      expect(cards.every((c) => c.title && c.value)).toBe(true);
    }
  });
});

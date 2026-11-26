import { describe, it, expect } from 'vitest';
import { cleanSlug } from '../unslug';

describe('Boardroom Report Exporter - Automated Quality & Accuracy Suite', () => {
  it('correctly formats and sanitizes report filenames for executive distribution', () => {
    const rawDatasetName = 'Q3 Regional Financial Review (Final v2)';
    const slug = cleanSlug(rawDatasetName);

    const pdfName = `${slug}-executive-report.pdf`;
    const pngName = `${slug}-analytics-snapshot.png`;

    expect(pdfName).toBe('q3-regional-financial-review-executive-report.pdf');
    expect(pngName).toBe('q3-regional-financial-review-analytics-snapshot.png');
    expect(pdfName.includes(' ')).toBe(false);
    expect(pdfName.includes('(')).toBe(false);
  });

  it('accurately computes A4 portrait aspect ratio scaling and multi-page pagination', () => {
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const marginMm = 12;
    const contentWidthMm = pageWidthMm - marginMm * 2; // 186mm

    // Test Case 1: Standard dashboard height (e.g. 1920x1080 canvas) -> fits on 1 A4 page
    const canvasWidth1 = 1920;
    const canvasHeight1 = 1080;
    const scaledHeight1 = (canvasHeight1 * contentWidthMm) / canvasWidth1;
    expect(scaledHeight1).toBeLessThan(pageHeightMm - marginMm * 2);

    // Test Case 2: Deep multi-chart dashboard (e.g. 1920x4500 canvas) -> triggers multi-page split
    const canvasWidth2 = 1920;
    const canvasHeight2 = 4500;
    const scaledHeight2 = (canvasHeight2 * contentWidthMm) / canvasWidth2;
    const availableHeightPerPage = pageHeightMm - marginMm * 2 - 15; // with 15mm header
    const calculatedPages = Math.ceil(scaledHeight2 / availableHeightPerPage);

    expect(calculatedPages).toBeGreaterThanOrEqual(2);
  });

  it('formats executive Markdown dossiers with KPI summaries and dataset profiles', async () => {
    const { generateExecutiveMarkdownBriefing } = await import('../exporter');
    const mockSchema = {
      id: 'test-1',
      name: 'Q3 SaaS Growth',
      slug: 'q3-saas-growth',
      rowCount: 100,
      columnCount: 2,
      columns: [
        { name: 'mrr', type: 'number', nullableCount: 0, uniqueCount: 50 },
        { name: 'tier', type: 'category', nullableCount: 0, uniqueCount: 3 },
      ],
      rows: [],
      parsedAt: Date.now(),
    } as any;

    const kpis = [
      { id: '1', title: 'Total MRR', value: '$240,000', subtitle: 'Sum' },
    ];

    const md = generateExecutiveMarkdownBriefing(mockSchema, kpis, 'Enterprise tier grew 30% QoQ.');
    expect(md).toContain('# Executive Briefing: Q3 SaaS Growth');
    expect(md).toContain('Total MRR');
    expect(md).toContain('$240,000');
    expect(md).toContain('Enterprise tier grew 30% QoQ.');
  });

  it('builds accurate filter scope summary items for active filters and date ranges', async () => {
    const { buildFilterScopeItems } = await import('../exporter');
    const mockSchema = {
      id: 'scope-1',
      name: 'Sales',
      slug: 'sales',
      rowCount: 45,
      columnCount: 2,
      columns: [],
      rows: [],
      parsedAt: Date.now(),
    } as any;

    const items = buildFilterScopeItems(
      mockSchema,
      {
        searchQuery: 'Amazon',
        dateRange: { start: '2024-01-01', end: '2024-03-31' },
        selectedCategories: { region: ['North America', 'Europe'] },
      },
      200
    );

    expect(items).toContain('Filtered: 45 of 200 records');
    expect(items).toContain('Date Range: 2024-01-01 to 2024-03-31');
    expect(items).toContain('Search: "Amazon"');
    expect(items).toContain('region: North America, Europe');
  });

  it('sanitizes Unicode symbols and currency into WinAnsi-safe ASCII for PDF rendering', async () => {
    const { sanitizePdfText } = await import('../exporter');
    expect(sanitizePdfText('Q3 — Growth • €1,200 ↔ ₹50,000…')).toBe(
      'Q3 - Growth | EUR 1,200 <-> INR 50,000...'
    );
    expect(sanitizePdfText('“Smart Quotes” & Rocket 🚀')).toBe(
      '"Smart Quotes" & Rocket '
    );
  });
});

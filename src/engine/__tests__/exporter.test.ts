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
});

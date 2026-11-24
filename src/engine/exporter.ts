/**
 * exporter.ts
 *
 * Industrial-Grade Multi-Format Export Engine for DataLens
 *
 * Capabilities:
 * 1. Executive Boardroom PDF (Landscape / Portrait, auto-paginated, headers, watermarks)
 * 2. Ultra-HD Retina PNG Snapshot (2x pixel ratio, clean background)
 * 3. Formatted Multi-Sheet Excel Workbook (.xlsx) with XLSX (Summary + Data + Correlation)
 * 4. Filtered Tabular CSV Export (RFC 4180 compliant with UTF-8 BOM)
 * 5. Executive Markdown / Plaintext Briefing for memos & email
 */

import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { cleanSlug } from './unslug';
import type { DatasetSchema, KpiCard } from '../types/dataset';

// ── Export Configuration Types ─────────────────────────────────────────

export type PdfOrientation = 'landscape' | 'portrait';

export interface ReportCustomization {
  title: string;
  subtitle?: string;
  preparedFor?: string;
  classification?: 'Confidential' | 'Internal Only' | 'Public' | 'Restricted';
  orientation: PdfOrientation;
  includeKpis: boolean;
  includeBriefing: boolean;
  includeCharts: boolean;
  includeSimulator: boolean;
  includeCorrelation: boolean;
  includeDataSample: boolean;
}

export const DEFAULT_REPORT_CUSTOMIZATION: ReportCustomization = {
  title: 'Executive Analytics Briefing',
  subtitle: 'Generated via DataLens Universal Engine',
  preparedFor: 'Executive Leadership & Board',
  classification: 'Internal Only',
  orientation: 'landscape',
  includeKpis: true,
  includeBriefing: true,
  includeCharts: true,
  includeSimulator: true,
  includeCorrelation: true,
  includeDataSample: true,
};

// ── 1. High-Resolution PNG Snapshot ───────────────────────────────────

export async function exportDashboardAsPng(
  element: HTMLElement,
  datasetName: string,
  pixelRatio: number = 2
): Promise<string> {
  const dataUrl = await toPng(element, {
    quality: 0.98,
    pixelRatio,
    backgroundColor: '#09090b',
    cacheBust: true,
    filter: (node) => {
      if (node instanceof HTMLElement && node.getAttribute('data-export-ignore') === 'true') {
        return false;
      }
      return true;
    },
  });

  const slug = cleanSlug(datasetName);
  const link = document.createElement('a');
  link.download = `${slug}-analytics-snapshot.png`;
  link.href = dataUrl;
  link.click();

  return dataUrl;
}

// ── 2. Executive Multi-Page PDF Report ─────────────────────────────────

export async function exportDashboardAsPdf(
  element: HTMLElement,
  datasetName: string,
  config: ReportCustomization = DEFAULT_REPORT_CUSTOMIZATION
): Promise<void> {
  const isLandscape = config.orientation === 'landscape';

  const dataUrl = await toPng(element, {
    quality: 0.98,
    pixelRatio: 2,
    backgroundColor: '#09090b',
    cacheBust: true,
    filter: (node) => {
      if (node instanceof HTMLElement && node.getAttribute('data-export-ignore') === 'true') {
        return false;
      }
      return true;
    },
  });

  const pdf = new jsPDF({
    orientation: config.orientation,
    unit: 'mm',
    format: 'a4',
  });

  // A4 dimensions in mm: Portrait = 210 x 297, Landscape = 297 x 210
  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;
  const margin = 12;
  const headerHeight = 18;
  const footerHeight = 12;
  const contentWidth = pageWidth - margin * 2;
  const availableContentHeight = pageHeight - headerHeight - footerHeight - margin;

  const imgProps = pdf.getImageProperties(dataUrl);
  const scaledHeight = (imgProps.height * contentWidth) / imgProps.width;

  const totalPages = Math.max(1, Math.ceil(scaledHeight / availableContentHeight));

  const addHeaderAndFooter = (pageNum: number) => {
    // Header Bar
    pdf.setFillColor(15, 15, 19);
    pdf.rect(0, 0, pageWidth, headerHeight, 'F');

    // Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text(config.title || `Executive Report — ${datasetName}`, margin, 11);

    // Classification Badge
    if (config.classification) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(244, 63, 94); // Rose
      pdf.text(config.classification.toUpperCase(), margin + 110, 11);
    }

    // Metadata Right-Aligned
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(161, 161, 170);
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    pdf.text(`${dateStr} • Prepared for: ${config.preparedFor || 'Board'}`, pageWidth - margin - 60, 11);

    // Dividing rule
    pdf.setDrawColor(39, 39, 42);
    pdf.line(0, headerHeight, pageWidth, headerHeight);

    // Footer Bar
    pdf.setFillColor(15, 15, 19);
    pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
    pdf.setDrawColor(39, 39, 42);
    pdf.line(0, pageHeight - footerHeight, pageWidth, pageHeight - footerHeight);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(113, 113, 122);
    pdf.text('DataLens Universal Business Intelligence Engine', margin, pageHeight - 4);
    pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 4);
  };

  for (let i = 0; i < totalPages; i++) {
    if (i > 0) pdf.addPage();
    addHeaderAndFooter(i + 1);

    // Shift image slice up for subsequent pages
    const position = headerHeight + margin / 2 - i * availableContentHeight;

    pdf.addImage(
      dataUrl,
      'PNG',
      margin,
      position,
      contentWidth,
      scaledHeight,
      undefined,
      'FAST'
    );
  }

  const slug = cleanSlug(datasetName);
  pdf.save(`${slug}-executive-dossier.pdf`);
}

// ── 3. Multi-Sheet Excel Workbook (.xlsx) ─────────────────────────────

export function exportDatasetAsExcel(
  dataset: DatasetSchema,
  kpis: KpiCard[] = [],
  strongestPairs: { colA: string; colB: string; coefficient: number }[] = []
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Executive KPI Summary
  const summaryData = [
    ['Executive Summary', dataset.name],
    ['Total Records', dataset.rowCount],
    ['Total Columns', dataset.columnCount],
    ['Exported At', new Date().toISOString()],
    [],
    ['KPI Metric', 'Value', 'Subtitle'],
    ...kpis.map((k) => [k.title, k.value, k.subtitle || '']),
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Executive Summary');

  // Sheet 2: Tabular Records
  const recordsSheet = XLSX.utils.json_to_sheet(dataset.rows);
  XLSX.utils.book_append_sheet(wb, recordsSheet, 'Records');

  // Sheet 3: Statistical Correlations (if available)
  if (strongestPairs.length > 0) {
    const correlationData = [
      ['Dimension A', 'Dimension B', 'Pearson r Coefficient'],
      ...strongestPairs.map((p) => [p.colA, p.colB, p.coefficient]),
    ];
    const corrSheet = XLSX.utils.aoa_to_sheet(correlationData);
    XLSX.utils.book_append_sheet(wb, corrSheet, 'Correlations');
  }

  const slug = cleanSlug(dataset.name);
  XLSX.writeFile(wb, `${slug}-analytics-workbook.xlsx`);
}

// ── 4. RFC-4180 Cleaned CSV Export ─────────────────────────────────────

export function exportRowsAsCsv(
  rows: Record<string, any>[],
  filename: string
): void {
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]);

  const escapeCell = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows: string[] = [];
  csvRows.push(headers.map(escapeCell).join(','));

  for (const row of rows) {
    csvRows.push(headers.map((h) => escapeCell(row[h])).join(','));
  }

  // UTF-8 BOM ensures seamless opening in Microsoft Excel without character corruption
  const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${cleanSlug(filename)}-cleaned.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ── 5. Executive Markdown / Plaintext Briefing ─────────────────────────

export function generateExecutiveMarkdownBriefing(
  dataset: DatasetSchema,
  kpis: KpiCard[],
  aiBriefingText?: string
): string {
  const lines: string[] = [];

  lines.push(`# Executive Briefing: ${dataset.name}`);
  lines.push(`*Generated on ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })} via DataLens Analytics*`);
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## 📌 Executive KPIs');
  for (const kpi of kpis) {
    lines.push(`- **${kpi.title}**: \`${kpi.value}\` ${kpi.subtitle ? `_(${kpi.subtitle})_` : ''}`);
  }
  lines.push('');

  if (aiBriefingText) {
    lines.push('## 💡 Strategic Takeaways & Root-Cause Attribution');
    lines.push(aiBriefingText);
    lines.push('');
  }

  lines.push('## 📊 Dataset Profile');
  lines.push(`- **Sample Size**: ${dataset.rowCount.toLocaleString()} records`);
  lines.push(`- **Dimensions**: ${dataset.columnCount} columns`);
  lines.push(`- **Numeric Metrics**: ${dataset.columns.filter((c) => c.type === 'number').map((c) => c.name).join(', ')}`);
  lines.push(`- **Categorical Dimensions**: ${dataset.columns.filter((c) => c.type === 'category').map((c) => c.name).join(', ')}`);
  lines.push('');
  lines.push('---');
  lines.push('*CONFIDENTIAL — FOR INTERNAL USE ONLY*');

  return lines.join('\n');
}

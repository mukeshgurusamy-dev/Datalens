/**
 * exporter.ts
 *
 * Industrial-Grade Multi-Format Export Engine for DataLens
 *
 * Capabilities:
 * 1. Flexible Executive PDF Report (A4 / Letter, Landscape / Portrait, Dark / Light theme,
 *    section-aware pagination with zero sliced charts, proportional tables, WinAnsi-safe text,
 *    selectable vector KPIs, stats, correlations, data sample, and analyst notes)
 * 2. Formatted Multi-Sheet Excel Workbook (.xlsx) with XLSX (Summary + Data + Correlation)
 * 3. Filtered Tabular CSV Export (RFC 4180 compliant with UTF-8 BOM)
 * 4. Executive Markdown Briefing (programmatic helper)
 */

import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import writeXlsxFile, { type Sheet, type SheetData } from 'write-excel-file/browser';
import { cleanSlug } from './unslug';
import { neutralizeSpreadsheetFormula } from './security';
import { computeCorrelationMatrix } from './worker-tasks';
import type {
  ChartRecommendation,
  DataFilterState,
  DatasetSchema,
  KpiCard,
} from '../types/dataset';

// ── Export Configuration Types ─────────────────────────────────────────

export type PdfOrientation = 'landscape' | 'portrait';
export type PdfPaperSize = 'a4' | 'letter';
export type ReportTheme = 'dark' | 'light';

export interface ReportCustomization {
  title: string;
  subtitle?: string;
  preparedFor?: string;
  classification?: 'Confidential' | 'Internal Only' | 'Public' | 'Restricted';
  orientation: PdfOrientation;
  paperSize: PdfPaperSize;
  theme: ReportTheme;
  includeHeader: boolean;
  includeFilterScope: boolean;
  includeKpis: boolean;
  includeCharts: boolean;
  selectedChartIds?: string[];
  includeColumnStats: boolean;
  includeCorrelation: boolean;
  includeDataSample: boolean;
  dataSampleLimit: 10 | 25 | 50;
  customNotes?: string;
}

export const DEFAULT_REPORT_CUSTOMIZATION: ReportCustomization = {
  title: 'Executive Analytics Report',
  subtitle: 'Generated via DataLens Client-Side BI Engine',
  preparedFor: 'Executive Leadership',
  classification: 'Internal Only',
  orientation: 'landscape',
  paperSize: 'a4',
  theme: 'dark',
  includeHeader: true,
  includeFilterScope: true,
  includeKpis: true,
  includeCharts: true,
  includeColumnStats: true,
  includeCorrelation: true,
  includeDataSample: true,
  dataSampleLimit: 10,
  customNotes: '',
};

export interface FlexibleReportInput {
  dataset: DatasetSchema;
  kpis: KpiCard[];
  charts?: ChartRecommendation[];
  filters?: DataFilterState;
  totalRowCount?: number;
  config: ReportCustomization;
}

interface CapturedChart {
  id: string;
  title: string;
  dataUrl: string;
  width: number;
  height: number;
}

// ── Shared Helpers ─────────────────────────────────────────────────────

/**
 * Normalizes Unicode punctuation and currency symbols into WinAnsi-safe ASCII
 * so jsPDF's built-in Helvetica font never renders garbled glyphs.
 */
export function sanitizePdfText(input: string): string {
  if (!input) return '';
  return input
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '|')
    .replace(/\u2194/g, '<->')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u20B9/g, 'INR ')
    .replace(/\u20AC/g, 'EUR ')
    .replace(/\u00A3/g, 'GBP ')
    .replace(/\u00A5/g, 'JPY ')
    .replace(/[^\x20-\x7E\n\r\t]/g, '');
}

export function buildFilterScopeItems(
  dataset: DatasetSchema,
  filters?: DataFilterState,
  totalRowCount?: number
): string[] {
  const items: string[] = [];
  const total = totalRowCount ?? dataset.rowCount;
  items.push(
    dataset.rowCount === total
      ? `Scope: All ${total.toLocaleString()} records`
      : `Filtered: ${dataset.rowCount.toLocaleString()} of ${total.toLocaleString()} records`
  );

  if (filters?.dateRange?.start && filters?.dateRange?.end) {
    items.push(`Date Range: ${filters.dateRange.start} to ${filters.dateRange.end}`);
  }
  if (filters?.searchQuery?.trim()) {
    items.push(`Search: "${filters.searchQuery.trim()}"`);
  }
  if (filters?.selectedCategories) {
    for (const [col, vals] of Object.entries(filters.selectedCategories)) {
      if (vals && vals.length > 0) {
        items.push(`${col}: ${vals.join(', ')}`);
      }
    }
  }
  return items;
}

async function captureSelectedCharts(
  charts: ChartRecommendation[] = [],
  selectedChartIds?: string[],
  pixelRatio: number = 2
): Promise<CapturedChart[]> {
  const allowedIds =
    selectedChartIds !== undefined
      ? new Set(selectedChartIds)
      : new Set(charts.map((c) => c.id));

  const captured: CapturedChart[] = [];
  const chartNodes = Array.from(
    document.querySelectorAll<HTMLElement>('[data-chart-id]')
  );

  for (const node of chartNodes) {
    const id = node.getAttribute('data-chart-id') || '';
    if (!allowedIds.has(id)) continue;

    const meta = charts.find((c) => c.id === id);
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    const dataUrl = await toPng(node, {
      quality: 0.98,
      pixelRatio,
      backgroundColor: '#121215',
      cacheBust: true,
    });

    captured.push({
      id,
      title: meta?.title || id,
      dataUrl,
      width: rect.width,
      height: rect.height,
    });
  }

  return captured;
}

function getCorrelationPairs(dataset: DatasetSchema) {
  const numericCols = dataset.columns
    .filter((c) => c.type === 'number')
    .map((c) => c.name);
  if (numericCols.length < 2) return [];
  return computeCorrelationMatrix(dataset.rows, numericCols).strongestPairs.slice(0, 10);
}

function formatCell(val: unknown, maxLen = 28): string {
  if (val === null || val === undefined || val === '') return '-';
  const str = sanitizePdfText(String(val));
  return str.length > maxLen ? `${str.slice(0, maxLen - 3)}...` : str;
}

function fitTextToWidth(pdf: jsPDF, text: string, maxWidthMm: number): string {
  const clean = sanitizePdfText(text);
  if (pdf.getTextWidth(clean) <= maxWidthMm) return clean;
  let truncated = clean;
  while (truncated.length > 3 && pdf.getTextWidth(`${truncated}...`) > maxWidthMm) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}...`;
}

// ── 1. Flexible Section-Aware Vector + High-DPI PDF Export ─────────────

export async function exportFlexiblePdf(input: FlexibleReportInput): Promise<void> {
  const { dataset, kpis, charts = [], filters, totalRowCount, config } = input;
  const isLandscape = config.orientation === 'landscape';
  const isDark = config.theme === 'dark';

  const capturedCharts = config.includeCharts
    ? await captureSelectedCharts(charts, config.selectedChartIds, 2)
    : [];

  const filterItems = config.includeFilterScope
    ? buildFilterScopeItems(dataset, filters, totalRowCount)
    : [];

  const correlations = config.includeCorrelation
    ? getCorrelationPairs(dataset)
    : [];

  const sampleLimit = config.dataSampleLimit || 10;
  const sampleRows = config.includeDataSample ? dataset.rows.slice(0, sampleLimit) : [];
  const maxSampleCols = isLandscape ? 8 : 6;
  const sampleCols = dataset.columns.slice(0, maxSampleCols).map((c) => c.name);

  const pdf = new jsPDF({
    orientation: config.orientation,
    unit: 'mm',
    format: config.paperSize || 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const headerH = config.includeHeader ? 18 : 10;
  const footerH = 11;
  const contentWidth = pageWidth - margin * 2;
  const maxY = pageHeight - footerH - 4;

  // Theme colors
  const bgRgb: [number, number, number] = isDark ? [9, 9, 11] : [248, 250, 252];
  const cardRgb: [number, number, number] = isDark ? [18, 18, 21] : [255, 255, 255];
  const borderRgb: [number, number, number] = isDark ? [39, 39, 42] : [203, 213, 225];
  const textRgb: [number, number, number] = isDark ? [244, 244, 245] : [15, 23, 42];
  const mutedRgb: [number, number, number] = isDark ? [161, 161, 170] : [71, 85, 105];
  const barRgb: [number, number, number] = isDark ? [15, 15, 19] : [241, 245, 249];

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const paintPageFrame = () => {
    pdf.setFillColor(...bgRgb);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    if (config.includeHeader) {
      pdf.setFillColor(...barRgb);
      pdf.rect(0, 0, pageWidth, headerH, 'F');
      pdf.setDrawColor(...borderRgb);
      pdf.line(0, headerH, pageWidth, headerH);

      // Measure right-side metadata & classification pill first so title never overlaps
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const rightText = sanitizePdfText(
        `${dateStr}${config.preparedFor ? ` | ${config.preparedFor}` : ''}`
      );
      const rightWidth = pdf.getTextWidth(rightText);

      let classWidth = 0;
      const classLabel = config.classification ? config.classification.toUpperCase() : '';
      if (classLabel) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.5);
        classWidth = pdf.getTextWidth(classLabel) + 6;
      }

      // Draw right metadata
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...mutedRgb);
      pdf.text(rightText, pageWidth - margin, 11, { align: 'right' });

      // Draw classification pill left of rightText
      if (classLabel) {
        const badgeX = pageWidth - margin - rightWidth - classWidth - 4;
        pdf.setFillColor(244, 63, 94);
        pdf.roundedRect(badgeX, 6.8, classWidth, 5.8, 1.5, 1.5, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.5);
        pdf.setTextColor(255, 255, 255);
        pdf.text(classLabel, badgeX + classWidth / 2, 10.7, { align: 'center' });
      }

      // Draw title fitted to remaining space
      const reservedRight = rightWidth + (classWidth > 0 ? classWidth + 10 : 6);
      const maxTitleWidth = Math.max(40, contentWidth - reservedRight);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(...textRgb);
      const fittedTitle = fitTextToWidth(pdf, config.title || dataset.name, maxTitleWidth);
      pdf.text(fittedTitle, margin, 11);
    }
  };

  paintPageFrame();
  let cursorY = headerH + 6;

  const ensureSpace = (neededMm: number) => {
    if (cursorY + neededMm > maxY) {
      pdf.addPage();
      paintPageFrame();
      cursorY = headerH + 6;
    }
  };

  const drawSectionHeading = (label: string) => {
    ensureSpace(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...textRgb);
    pdf.text(sanitizePdfText(label), margin, cursorY + 4);
    cursorY += 7;
  };

  // 1. Subtitle & Dataset Summary Line
  if (config.includeHeader) {
    const metaLine = sanitizePdfText(
      `${config.subtitle ? `${config.subtitle}  |  ` : ''}Dataset: ${dataset.name} (${dataset.rowCount.toLocaleString()} rows, ${dataset.columnCount} columns)`
    );
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...mutedRgb);
    const metaLines = pdf.splitTextToSize(metaLine, contentWidth);
    pdf.text(metaLines, margin, cursorY + 2);
    cursorY += metaLines.length * 4 + 2;
  }

  // 2. Active Filter Scope (auto-wrapped box)
  if (config.includeFilterScope && filterItems.length > 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    const scopeText = sanitizePdfText(filterItems.join('   |   '));
    const scopeLines = pdf.splitTextToSize(scopeText, contentWidth - 6);
    const boxH = scopeLines.length * 4.2 + 4.5;
    ensureSpace(boxH + 4);
    pdf.setFillColor(...cardRgb);
    pdf.setDrawColor(...borderRgb);
    pdf.roundedRect(margin, cursorY, contentWidth, boxH, 2, 2, 'FD');
    pdf.setTextColor(...mutedRgb);
    pdf.text(scopeLines, margin + 3, cursorY + 4.8);
    cursorY += boxH + 4;
  }

  // 3. KPI Cards (with trend badges)
  if (config.includeKpis && kpis.length > 0) {
    const cols = isLandscape ? Math.min(4, kpis.length) : 2;
    const rowsCount = Math.ceil(kpis.length / cols);
    const gap = 4;
    const cardW = (contentWidth - gap * (cols - 1)) / cols;
    const cardH = 21;

    for (let r = 0; r < rowsCount; r++) {
      ensureSpace(cardH + 4);
      for (let c = 0; c < cols; c++) {
        const k = kpis[r * cols + c];
        if (!k) continue;
        const x = margin + c * (cardW + gap);
        pdf.setFillColor(...cardRgb);
        pdf.setDrawColor(...borderRgb);
        pdf.roundedRect(x, cursorY, cardW, cardH, 2.5, 2.5, 'FD');

        // Trend change badge (top-right)
        let reservedTitleRight = 4;
        if (k.change !== undefined) {
          const changeStr = k.change > 0 ? `+${k.change}%` : `${k.change}%`;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7);
          if (k.trend === 'up') {
            pdf.setTextColor(16, 185, 129);
          } else if (k.trend === 'down') {
            pdf.setTextColor(244, 63, 94);
          } else {
            pdf.setTextColor(...mutedRgb);
          }
          pdf.text(changeStr, x + cardW - 3.5, cursorY + 5.5, { align: 'right' });
          reservedTitleRight = pdf.getTextWidth(changeStr) + 7;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(...mutedRgb);
        const fittedKpiTitle = fitTextToWidth(
          pdf,
          k.title.toUpperCase(),
          cardW - 3.5 - reservedTitleRight
        );
        pdf.text(fittedKpiTitle, x + 3.5, cursorY + 5.5);

        pdf.setFontSize(13);
        pdf.setTextColor(...textRgb);
        pdf.text(fitTextToWidth(pdf, k.value, cardW - 7), x + 3.5, cursorY + 12.8);

        if (k.subtitle) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(6.5);
          pdf.setTextColor(...mutedRgb);
          pdf.text(fitTextToWidth(pdf, k.subtitle, cardW - 7), x + 3.5, cursorY + 17.8);
        }
      }
      cursorY += cardH + gap;
    }
    cursorY += 2;
  }

  // 4. Selected Charts (section-aware pagination: never sliced across pages)
  if (capturedCharts.length > 0) {
    drawSectionHeading(`Visualizations (${capturedCharts.length})`);
    const cols = isLandscape ? 2 : 1;
    const gap = 4;
    const chartW = (contentWidth - gap * (cols - 1)) / cols;

    for (let i = 0; i < capturedCharts.length; i += cols) {
      const rowCharts = capturedCharts.slice(i, i + cols);
      const rowHeight = Math.max(
        ...rowCharts.map((ch) => Math.min(95, (ch.height * chartW) / ch.width))
      );

      ensureSpace(rowHeight + 4);

      rowCharts.forEach((ch, idx) => {
        const x = margin + idx * (chartW + gap);
        const h = Math.min(95, (ch.height * chartW) / ch.width);
        pdf.addImage(ch.dataUrl, 'PNG', x, cursorY, chartW, h, undefined, 'FAST');
        // Crisp border frame (especially helpful in Light theme)
        pdf.setDrawColor(...borderRgb);
        pdf.roundedRect(x, cursorY, chartW, h, 2, 2, 'S');
      });

      cursorY += rowHeight + gap;
    }
    cursorY += 2;
  }

  // 5. Column Statistics Table (proportional widths fit A4 & Letter)
  if (config.includeColumnStats && dataset.columns.length > 0) {
    drawSectionHeading(`Dataset Schema & Column Statistics (${dataset.columns.length} columns)`);
    const proportions = [0.22, 0.1, 0.08, 0.08, 0.12, 0.12, 0.13, 0.15];
    const colWidths = proportions.map((p) => p * contentWidth);
    const headers = ['Column', 'Type', 'Unique', 'Nulls', 'Min', 'Max', 'Mean', 'Sum'];

    const drawTableHeader = () => {
      ensureSpace(12);
      pdf.setFillColor(...barRgb);
      pdf.setDrawColor(...borderRgb);
      pdf.rect(margin, cursorY, contentWidth, 7, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(...mutedRgb);
      let x = margin + 2;
      headers.forEach((h, idx) => {
        pdf.text(h, x, cursorY + 4.8);
        x += colWidths[idx];
      });
      cursorY += 7;
    };

    drawTableHeader();
    for (const col of dataset.columns) {
      if (cursorY + 6.5 > maxY) {
        pdf.addPage();
        paintPageFrame();
        cursorY = headerH + 6;
        drawTableHeader();
      }
      pdf.setFillColor(...cardRgb);
      pdf.setDrawColor(...borderRgb);
      pdf.rect(margin, cursorY, contentWidth, 6, 'FD');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(...textRgb);

      const vals = [
        fitTextToWidth(pdf, col.name, colWidths[0] - 4),
        col.type,
        col.uniqueCount.toLocaleString(),
        col.nullableCount.toLocaleString(),
        col.min !== undefined ? fitTextToWidth(pdf, col.min.toLocaleString(), colWidths[4] - 3) : '-',
        col.max !== undefined ? fitTextToWidth(pdf, col.max.toLocaleString(), colWidths[5] - 3) : '-',
        col.mean !== undefined ? fitTextToWidth(pdf, col.mean.toFixed(2), colWidths[6] - 3) : '-',
        col.sum !== undefined ? fitTextToWidth(pdf, col.sum.toLocaleString(), colWidths[7] - 3) : '-',
      ];
      let x = margin + 2;
      vals.forEach((v, idx) => {
        pdf.text(v, x, cursorY + 4.2);
        x += colWidths[idx];
      });
      cursorY += 6;
    }
    cursorY += 5;
  }

  // 6. Key Correlations
  if (correlations.length > 0) {
    drawSectionHeading('Statistical Correlations (|r| >= 0.25)');
    const cols = 2;
    const gap = 4;
    const boxW = (contentWidth - gap) / cols;
    for (let i = 0; i < correlations.length; i += cols) {
      ensureSpace(10);
      for (let c = 0; c < cols; c++) {
        const pair = correlations[i + c];
        if (!pair) continue;
        const x = margin + c * (boxW + gap);
        pdf.setFillColor(...cardRgb);
        pdf.setDrawColor(...borderRgb);
        pdf.roundedRect(x, cursorY, boxW, 8, 1.5, 1.5, 'FD');

        const coeffStr =
          pair.coefficient > 0
            ? `+${pair.coefficient.toFixed(2)}`
            : pair.coefficient.toFixed(2);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(...textRgb);
        pdf.text(
          fitTextToWidth(pdf, `${pair.colA} <-> ${pair.colB}`, boxW - 22),
          x + 3,
          cursorY + 5.2
        );

        pdf.setFont('helvetica', 'bold');
        if (pair.coefficient >= 0) {
          pdf.setTextColor(16, 185, 129);
        } else {
          pdf.setTextColor(244, 63, 94);
        }
        pdf.text(coeffStr, x + boxW - 3, cursorY + 5.2, { align: 'right' });
      }
      cursorY += 10;
    }
    cursorY += 2;
  }

  // 7. Filtered Data Sample
  if (sampleRows.length > 0 && sampleCols.length > 0) {
    const colSuffix =
      dataset.columns.length > maxSampleCols
        ? ` | showing ${sampleCols.length} of ${dataset.columns.length} cols`
        : '';
    drawSectionHeading(
      `Filtered Data Sample (Top ${sampleRows.length} of ${dataset.rowCount.toLocaleString()} rows${colSuffix})`
    );
    const colW = contentWidth / sampleCols.length;

    const drawSampleHeader = () => {
      ensureSpace(12);
      pdf.setFillColor(...barRgb);
      pdf.setDrawColor(...borderRgb);
      pdf.rect(margin, cursorY, contentWidth, 7, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.8);
      pdf.setTextColor(...mutedRgb);
      sampleCols.forEach((col, idx) => {
        pdf.text(
          fitTextToWidth(pdf, col, colW - 4),
          margin + idx * colW + 2,
          cursorY + 4.8
        );
      });
      cursorY += 7;
    };

    drawSampleHeader();
    for (const row of sampleRows) {
      if (cursorY + 6 > maxY) {
        pdf.addPage();
        paintPageFrame();
        cursorY = headerH + 6;
        drawSampleHeader();
      }
      pdf.setFillColor(...cardRgb);
      pdf.setDrawColor(...borderRgb);
      pdf.rect(margin, cursorY, contentWidth, 5.8, 'FD');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.8);
      pdf.setTextColor(...textRgb);
      sampleCols.forEach((col, idx) => {
        pdf.text(
          fitTextToWidth(pdf, formatCell(row[col], 40), colW - 4),
          margin + idx * colW + 2,
          cursorY + 4
        );
      });
      cursorY += 5.8;
    }
    cursorY += 5;
  }

  // 8. Custom Analyst Notes (paginated across pages if long)
  if (config.customNotes && config.customNotes.trim()) {
    drawSectionHeading('Analyst Commentary & Takeaways');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    const allLines: string[] = pdf.splitTextToSize(
      sanitizePdfText(config.customNotes.trim()),
      contentWidth - 8
    );

    let lineIdx = 0;
    while (lineIdx < allLines.length) {
      const remainingLines = allLines.length - lineIdx;
      const maxLinesHere = Math.max(1, Math.floor((maxY - cursorY - 8) / 4.5));
      if (maxLinesHere < 2 && cursorY > headerH + 10) {
        pdf.addPage();
        paintPageFrame();
        cursorY = headerH + 6;
        continue;
      }
      const chunkCount = Math.min(remainingLines, maxLinesHere);
      const chunk = allLines.slice(lineIdx, lineIdx + chunkCount);
      const blockH = chunk.length * 4.5 + 7;

      pdf.setFillColor(...cardRgb);
      pdf.setDrawColor(...borderRgb);
      pdf.roundedRect(margin, cursorY, contentWidth, blockH, 2, 2, 'FD');
      pdf.setTextColor(...textRgb);
      pdf.text(chunk, margin + 4, cursorY + 5.5);

      cursorY += blockH + 4;
      lineIdx += chunkCount;
    }
  }

  // Stamp Running Footers on every page with accurate Page X of Y
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFillColor(...barRgb);
    pdf.rect(0, pageHeight - footerH, pageWidth, footerH, 'F');
    pdf.setDrawColor(...borderRgb);
    pdf.line(0, pageHeight - footerH, pageWidth, pageHeight - footerH);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...mutedRgb);
    pdf.text('DataLens Client-Side Analytics Engine', margin, pageHeight - 4);
    pdf.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 4, {
      align: 'right',
    });
  }

  const slug = cleanSlug(dataset.name);
  pdf.save(`${slug}-executive-report.pdf`);
}

// ── 2. Multi-Sheet Excel Workbook (.xlsx) ─────────────────────────────

function toExcelCell(val: unknown) {
  if (val === null || val === undefined) return { value: '' };
  if (typeof val === 'number' && Number.isFinite(val)) return { type: Number, value: val };
  if (typeof val === 'boolean') return { type: Boolean, value: val };
  return { type: String, value: neutralizeSpreadsheetFormula(val) };
}

export async function exportDatasetAsExcel(
  dataset: DatasetSchema,
  kpis: KpiCard[] = [],
  strongestPairs: { colA: string; colB: string; coefficient: number }[] = []
): Promise<void> {
  const summaryData: SheetData = [
    [toExcelCell('Executive Summary'), toExcelCell(dataset.name)],
    [toExcelCell('Total Records'), toExcelCell(dataset.rowCount)],
    [toExcelCell('Total Columns'), toExcelCell(dataset.columnCount)],
    [toExcelCell('Exported At'), toExcelCell(new Date().toISOString())],
    [],
    [toExcelCell('KPI Metric'), toExcelCell('Value'), toExcelCell('Subtitle')],
    ...kpis.map((k) => [
      toExcelCell(k.title),
      toExcelCell(k.value),
      toExcelCell(k.subtitle || ''),
    ]),
  ];

  const headers = dataset.columns.map((c) => c.name);
  const recordsData: SheetData = [
    headers.map((h) => toExcelCell(h)),
    ...dataset.rows.map((row) => headers.map((h) => toExcelCell(row[h]))),
  ];

  const sheets: Sheet<Blob>[] = [
    { sheet: 'Executive Summary', data: summaryData },
    { sheet: 'Records', data: recordsData },
  ];

  if (strongestPairs.length > 0) {
    const corrData: SheetData = [
      [toExcelCell('Dimension A'), toExcelCell('Dimension B'), toExcelCell('Pearson r Coefficient')],
      ...strongestPairs.map((p) => [
        toExcelCell(p.colA),
        toExcelCell(p.colB),
        toExcelCell(p.coefficient),
      ]),
    ];
    sheets.push({ sheet: 'Correlations', data: corrData });
  }

  const slug = cleanSlug(dataset.name);
  await writeXlsxFile(sheets).toFile(`${slug}-analytics-workbook.xlsx`);
}

// ── 3. RFC-4180 Cleaned CSV Export (with CWE-1236 Formula Neutralization) ─

export function exportRowsAsCsv(
  rows: Record<string, any>[],
  filename: string
): void {
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]);

  const escapeCell = (val: any): string => {
    const str = neutralizeSpreadsheetFormula(val);
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

  const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${cleanSlug(filename)}-cleaned.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ── 4. Executive Markdown Briefing (Programmatic Helper) ───────────────

export function generateExecutiveMarkdownBriefing(
  dataset: DatasetSchema,
  kpis: KpiCard[],
  notesText?: string
): string {
  const lines: string[] = [];

  lines.push(`# Executive Briefing: ${dataset.name}`);
  lines.push(
    `*Generated on ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })} via DataLens Analytics*`
  );
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## 📌 Executive KPIs');
  for (const kpi of kpis) {
    lines.push(
      `- **${kpi.title}**: \`${kpi.value}\` ${kpi.subtitle ? `_(${kpi.subtitle})_` : ''}`
    );
  }
  lines.push('');

  if (notesText) {
    lines.push('## 💡 Strategic Takeaways');
    lines.push(notesText);
    lines.push('');
  }

  lines.push('## 📊 Dataset Profile');
  lines.push(`- **Sample Size**: ${dataset.rowCount.toLocaleString()} records`);
  lines.push(`- **Dimensions**: ${dataset.columnCount} columns`);

  return lines.join('\n');
}

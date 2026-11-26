/**
 * exporter.ts
 *
 * Industrial-Grade Multi-Format Export Engine for DataLens
 *
 * Capabilities:
 * 1. Flexible Executive PDF Dossier (A4 / Letter, Landscape / Portrait, Dark / Light theme,
 *    section-aware pagination with zero sliced charts, selectable vector tables & notes)
 * 2. Flexible Ultra-HD Image Snapshot (2x Retina / 3x Ultra-HD, PNG / JPEG, Dark / Light theme,
 *    full section composer matching PDF flexibility)
 * 3. Formatted Multi-Sheet Excel Workbook (.xlsx) with XLSX (Summary + Data + Correlation)
 * 4. Filtered Tabular CSV Export (RFC 4180 compliant with UTF-8 BOM)
 * 5. Executive Markdown Briefing (preserved for programmatic memo generation)
 */

import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { cleanSlug } from './unslug';
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
export type ImageFormat = 'png' | 'jpeg';
export type ImageScale = 2 | 3;

export interface ReportCustomization {
  title: string;
  subtitle?: string;
  preparedFor?: string;
  classification?: 'Confidential' | 'Internal Only' | 'Public' | 'Restricted';
  orientation: PdfOrientation;
  paperSize: PdfPaperSize;
  theme: ReportTheme;
  imageFormat: ImageFormat;
  imageScale: ImageScale;
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
  imageFormat: 'png',
  imageScale: 2,
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
  return computeCorrelationMatrix(dataset.rows, numericCols).strongestPairs.slice(0, 8);
}

function formatCell(val: unknown, maxLen = 28): string {
  if (val === null || val === undefined || val === '') return '—';
  const str = String(val);
  return str.length > maxLen ? `${str.slice(0, maxLen - 1)}…` : str;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── 1. Flexible High-Resolution Image Export (PNG / JPEG) ──────────────

export async function exportFlexibleImage(
  input: FlexibleReportInput
): Promise<string> {
  const { dataset, kpis, charts = [], filters, totalRowCount, config } = input;
  const isDark = config.theme === 'dark';
  const pixelRatio = config.imageScale || 2;

  const capturedCharts = config.includeCharts
    ? await captureSelectedCharts(charts, config.selectedChartIds, pixelRatio)
    : [];

  const filterItems = config.includeFilterScope
    ? buildFilterScopeItems(dataset, filters, totalRowCount)
    : [];

  const correlations = config.includeCorrelation
    ? getCorrelationPairs(dataset)
    : [];

  const sampleLimit = config.dataSampleLimit || 10;
  const sampleRows = config.includeDataSample ? dataset.rows.slice(0, sampleLimit) : [];
  const sampleCols = dataset.columns.slice(0, 8).map((c) => c.name);

  // Palette
  const bg = isDark ? '#09090b' : '#f8fafc';
  const cardBg = isDark ? '#121215' : '#ffffff';
  const border = isDark ? '#27272a' : '#e2e8f0';
  const textPrimary = isDark ? '#f4f4f5' : '#0f172a';
  const textMuted = isDark ? '#a1a1aa' : '#475569';
  const pillBg = isDark ? '#18181b' : '#f1f5f9';
  const accent = '#3b82f6';

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = '1400px';
  container.style.padding = '36px';
  container.style.backgroundColor = bg;
  container.style.color = textPrimary;
  container.style.fontFamily =
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.boxSizing = 'border-box';

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const sections: string[] = [];

  // Header
  if (config.includeHeader) {
    sections.push(`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;margin-bottom:22px;border-bottom:1px solid ${border};">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <span style="font-size:26px;font-weight:700;letter-spacing:-0.02em;color:${textPrimary};">${escapeHtml(config.title || dataset.name)}</span>
            ${
              config.classification
                ? `<span style="font-size:11px;font-weight:700;text-transform:uppercase;padding:3px 10px;border-radius:999px;background:rgba(244,63,94,0.14);color:#f43f5e;border:1px solid rgba(244,63,94,0.3);">${escapeHtml(config.classification)}</span>`
                : ''
            }
          </div>
          ${
            config.subtitle
              ? `<div style="font-size:13px;color:${textMuted};">${escapeHtml(config.subtitle)}</div>`
              : ''
          }
        </div>
        <div style="text-align:right;font-size:12px;color:${textMuted};line-height:1.6;">
          <div><strong style="color:${textPrimary};">${escapeHtml(dataset.name)}</strong> • ${dateStr}</div>
          ${config.preparedFor ? `<div>Prepared for: ${escapeHtml(config.preparedFor)}</div>` : ''}
        </div>
      </div>
    `);
  }

  // Filter Scope
  if (config.includeFilterScope && filterItems.length > 0) {
    sections.push(`
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px;">
        ${filterItems
          .map(
            (item) =>
              `<span style="font-size:11px;font-family:monospace;padding:5px 10px;border-radius:8px;background:${pillBg};border:1px solid ${border};color:${textMuted};">${escapeHtml(item)}</span>`
          )
          .join('')}
      </div>
    `);
  }

  // KPIs
  if (config.includeKpis && kpis.length > 0) {
    sections.push(`
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">
        ${kpis
          .map((k) => {
            const badgeColor =
              k.trend === 'up' ? '#10b981' : k.trend === 'down' ? '#f43f5e' : textMuted;
            return `
              <div style="background:${cardBg};border:1px solid ${border};border-radius:14px;padding:18px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${textMuted};">${escapeHtml(k.title)}</span>
                  ${
                    k.change !== undefined
                      ? `<span style="font-size:11px;font-weight:600;color:${badgeColor};">${k.change > 0 ? `+${k.change}%` : `${k.change}%`}</span>`
                      : ''
                  }
                </div>
                <div style="font-size:26px;font-weight:700;font-family:monospace;color:${textPrimary};">${escapeHtml(k.value)}</div>
                ${k.subtitle ? `<div style="font-size:11px;color:${textMuted};margin-top:6px;">${escapeHtml(k.subtitle)}</div>` : ''}
              </div>
            `;
          })
          .join('')}
      </div>
    `);
  }

  // Charts
  if (capturedCharts.length > 0) {
    sections.push(`
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-bottom:24px;">
        ${capturedCharts
          .map(
            (c) => `
              <div style="border-radius:16px;overflow:hidden;border:1px solid ${border};background:#121215;">
                <img src="${c.dataUrl}" style="display:block;width:100%;height:auto;" />
              </div>
            `
          )
          .join('')}
      </div>
    `);
  }

  // Column Statistics
  if (config.includeColumnStats && dataset.columns.length > 0) {
    sections.push(`
      <div style="background:${cardBg};border:1px solid ${border};border-radius:14px;padding:18px;margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:${textPrimary};">Dataset Schema & Column Statistics</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="border-bottom:1px solid ${border};color:${textMuted};text-align:left;font-family:monospace;">
              <th style="padding:7px 8px;">Column</th>
              <th style="padding:7px 8px;">Type</th>
              <th style="padding:7px 8px;">Unique</th>
              <th style="padding:7px 8px;">Nulls</th>
              <th style="padding:7px 8px;">Min</th>
              <th style="padding:7px 8px;">Max</th>
              <th style="padding:7px 8px;">Mean</th>
              <th style="padding:7px 8px;">Sum</th>
            </tr>
          </thead>
          <tbody>
            ${dataset.columns
              .slice(0, 15)
              .map(
                (col) => `
                <tr style="border-bottom:1px solid ${border};">
                  <td style="padding:6px 8px;font-weight:600;color:${textPrimary};">${escapeHtml(col.name)}</td>
                  <td style="padding:6px 8px;font-family:monospace;color:${accent};">${escapeHtml(col.type)}</td>
                  <td style="padding:6px 8px;font-family:monospace;color:${textMuted};">${col.uniqueCount.toLocaleString()}</td>
                  <td style="padding:6px 8px;font-family:monospace;color:${textMuted};">${col.nullableCount.toLocaleString()}</td>
                  <td style="padding:6px 8px;font-family:monospace;color:${textMuted};">${col.min !== undefined ? col.min.toLocaleString() : '—'}</td>
                  <td style="padding:6px 8px;font-family:monospace;color:${textMuted};">${col.max !== undefined ? col.max.toLocaleString() : '—'}</td>
                  <td style="padding:6px 8px;font-family:monospace;color:${textMuted};">${col.mean !== undefined ? col.mean.toFixed(2) : '—'}</td>
                  <td style="padding:6px 8px;font-family:monospace;color:${textMuted};">${col.sum !== undefined ? col.sum.toLocaleString() : '—'}</td>
                </tr>
              `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `);
  }

  // Correlations
  if (correlations.length > 0) {
    sections.push(`
      <div style="background:${cardBg};border:1px solid ${border};border-radius:14px;padding:18px;margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:${textPrimary};">Key Pearson Correlations (|r| ≥ 0.25)</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
          ${correlations
            .map((p) => {
              const color = p.coefficient >= 0 ? '#10b981' : '#f43f5e';
              return `
                <div style="padding:10px 12px;border-radius:10px;background:${pillBg};border:1px solid ${border};display:flex;justify-content:space-between;align-items:center;">
                  <div style="font-size:11px;color:${textPrimary};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:8px;">${escapeHtml(p.colA)} ↔ ${escapeHtml(p.colB)}</div>
                  <span style="font-size:12px;font-weight:700;font-family:monospace;color:${color};">${p.coefficient > 0 ? `+${p.coefficient.toFixed(2)}` : p.coefficient.toFixed(2)}</span>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `);
  }

  // Data Sample
  if (sampleRows.length > 0 && sampleCols.length > 0) {
    sections.push(`
      <div style="background:${cardBg};border:1px solid ${border};border-radius:14px;padding:18px;margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:${textPrimary};">Filtered Data Sample (Top ${sampleRows.length} of ${dataset.rowCount.toLocaleString()} rows)</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;font-family:monospace;">
          <thead>
            <tr style="border-bottom:1px solid ${border};color:${textMuted};text-align:left;">
              ${sampleCols.map((c) => `<th style="padding:6px 8px;">${escapeHtml(c)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${sampleRows
              .map(
                (r) => `
                <tr style="border-bottom:1px solid ${border};">
                  ${sampleCols.map((c) => `<td style="padding:5px 8px;color:${textPrimary};">${escapeHtml(formatCell(r[c]))}</td>`).join('')}
                </tr>
              `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `);
  }

  // Custom Notes
  if (config.customNotes && config.customNotes.trim()) {
    sections.push(`
      <div style="background:${cardBg};border:1px solid ${border};border-radius:14px;padding:18px;margin-bottom:16px;">
        <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:${textPrimary};">Analyst Commentary & Takeaways</div>
        <div style="font-size:12px;line-height:1.65;color:${textMuted};white-space:pre-wrap;">${escapeHtml(config.customNotes.trim())}</div>
      </div>
    `);
  }

  // Footer
  sections.push(`
    <div style="display:flex;justify-content:space-between;padding-top:12px;border-top:1px solid ${border};font-size:11px;color:${textMuted};">
      <span>DataLens Client-Side Analytics Engine</span>
      <span>${dataset.rowCount.toLocaleString()} rows • ${dataset.columnCount} columns • ${pixelRatio}x HD</span>
    </div>
  `);

  container.innerHTML = sections.join('');
  document.body.appendChild(container);

  try {
    // Wait for embedded chart <img> elements to decode before rasterizing
    const imgs = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      imgs.map((img) =>
        img.decode ? img.decode().catch(() => undefined) : Promise.resolve()
      )
    );

    const captureFn = config.imageFormat === 'jpeg' ? toJpeg : toPng;
    const dataUrl = await captureFn(container, {
      quality: 0.96,
      pixelRatio,
      backgroundColor: bg,
      cacheBust: true,
    });

    const ext = config.imageFormat === 'jpeg' ? 'jpg' : 'png';
    const slug = cleanSlug(dataset.name);
    const link = document.createElement('a');
    link.download = `${slug}-report-${pixelRatio}x.${ext}`;
    link.href = dataUrl;
    link.click();

    return dataUrl;
  } finally {
    document.body.removeChild(container);
  }
}

// ── 2. Flexible Section-Aware Vector + High-DPI PDF Export ─────────────

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
  const sampleCols = dataset.columns.slice(0, isLandscape ? 8 : 6).map((c) => c.name);

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
  const borderRgb: [number, number, number] = isDark ? [39, 39, 42] : [226, 232, 240];
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

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(...textRgb);
      pdf.text((config.title || dataset.name).slice(0, 58), margin, 11);

      if (config.classification) {
        pdf.setFontSize(7);
        pdf.setTextColor(244, 63, 94);
        pdf.text(config.classification.toUpperCase(), pageWidth / 2 - 10, 11);
      }

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...mutedRgb);
      const rightText = `${dateStr}${config.preparedFor ? ` • ${config.preparedFor}` : ''}`;
      pdf.text(rightText, pageWidth - margin, 11, { align: 'right' });
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
    pdf.text(label, margin, cursorY + 4);
    cursorY += 7;
  };

  // 1. Subtitle & Filter Scope
  if (config.includeHeader && config.subtitle) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...mutedRgb);
    pdf.text(config.subtitle, margin, cursorY + 2);
    cursorY += 6;
  }

  if (config.includeFilterScope && filterItems.length > 0) {
    ensureSpace(10);
    pdf.setFillColor(...cardRgb);
    pdf.setDrawColor(...borderRgb);
    pdf.roundedRect(margin, cursorY, contentWidth, 8, 2, 2, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...mutedRgb);
    const scopeLine = filterItems.join('   •   ');
    const truncatedScope =
      scopeLine.length > 130 ? `${scopeLine.slice(0, 127)}...` : scopeLine;
    pdf.text(truncatedScope, margin + 3, cursorY + 5.2);
    cursorY += 12;
  }

  // 2. KPI Cards
  if (config.includeKpis && kpis.length > 0) {
    const cols = isLandscape ? Math.min(4, kpis.length) : 2;
    const rowsCount = Math.ceil(kpis.length / cols);
    const gap = 4;
    const cardW = (contentWidth - gap * (cols - 1)) / cols;
    const cardH = 20;

    for (let r = 0; r < rowsCount; r++) {
      ensureSpace(cardH + 4);
      for (let c = 0; c < cols; c++) {
        const k = kpis[r * cols + c];
        if (!k) continue;
        const x = margin + c * (cardW + gap);
        pdf.setFillColor(...cardRgb);
        pdf.setDrawColor(...borderRgb);
        pdf.roundedRect(x, cursorY, cardW, cardH, 2.5, 2.5, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(...mutedRgb);
        pdf.text(k.title.toUpperCase().slice(0, 32), x + 3.5, cursorY + 5.5);

        pdf.setFontSize(13);
        pdf.setTextColor(...textRgb);
        pdf.text(k.value.slice(0, 22), x + 3.5, cursorY + 12.5);

        if (k.subtitle) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(6.5);
          pdf.setTextColor(...mutedRgb);
          pdf.text(k.subtitle.slice(0, 38), x + 3.5, cursorY + 17.2);
        }
      }
      cursorY += cardH + gap;
    }
    cursorY += 2;
  }

  // 3. Selected Charts (2-up in landscape, 1-up or 2-up in portrait; never sliced!)
  if (capturedCharts.length > 0) {
    drawSectionHeading('Visualizations');
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
      });

      cursorY += rowHeight + gap;
    }
    cursorY += 2;
  }

  // 4. Column Statistics Table
  if (config.includeColumnStats && dataset.columns.length > 0) {
    drawSectionHeading('Dataset Schema & Column Statistics');
    const colWidths = isLandscape
      ? [52, 26, 22, 22, 34, 34, 36, 47]
      : [42, 20, 16, 16, 22, 22, 22, 26];
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
    for (const col of dataset.columns.slice(0, 25)) {
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
        formatCell(col.name, 22),
        col.type,
        col.uniqueCount.toLocaleString(),
        col.nullableCount.toLocaleString(),
        col.min !== undefined ? col.min.toLocaleString() : '—',
        col.max !== undefined ? col.max.toLocaleString() : '—',
        col.mean !== undefined ? col.mean.toFixed(2) : '—',
        col.sum !== undefined ? col.sum.toLocaleString() : '—',
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

  // 5. Key Correlations
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

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(...textRgb);
        pdf.text(`${pair.colA} <-> ${pair.colB}`.slice(0, 42), x + 3, cursorY + 5.2);

        pdf.setFont('helvetica', 'bold');
        if (pair.coefficient >= 0) {
          pdf.setTextColor(16, 185, 129);
        } else {
          pdf.setTextColor(244, 63, 94);
        }
        const coeffStr =
          pair.coefficient > 0
            ? `+${pair.coefficient.toFixed(2)}`
            : pair.coefficient.toFixed(2);
        pdf.text(coeffStr, x + boxW - 3, cursorY + 5.2, { align: 'right' });
      }
      cursorY += 10;
    }
    cursorY += 2;
  }

  // 6. Filtered Data Sample
  if (sampleRows.length > 0 && sampleCols.length > 0) {
    drawSectionHeading(
      `Filtered Data Sample (Top ${sampleRows.length} of ${dataset.rowCount.toLocaleString()} rows)`
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
        pdf.text(formatCell(col, 16), margin + idx * colW + 2, cursorY + 4.8);
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
        pdf.text(formatCell(row[col], 18), margin + idx * colW + 2, cursorY + 4);
      });
      cursorY += 5.8;
    }
    cursorY += 5;
  }

  // 7. Custom Analyst Notes
  if (config.customNotes && config.customNotes.trim()) {
    drawSectionHeading('Analyst Commentary & Takeaways');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    const lines = pdf.splitTextToSize(config.customNotes.trim(), contentWidth - 8);
    const blockH = lines.length * 4.5 + 8;
    ensureSpace(blockH);
    pdf.setFillColor(...cardRgb);
    pdf.setDrawColor(...borderRgb);
    pdf.roundedRect(margin, cursorY, contentWidth, blockH, 2, 2, 'FD');
    pdf.setTextColor(...textRgb);
    pdf.text(lines, margin + 4, cursorY + 6);
    cursorY += blockH + 4;
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

// ── 3. Multi-Sheet Excel Workbook (.xlsx) ─────────────────────────────

export function exportDatasetAsExcel(
  dataset: DatasetSchema,
  kpis: KpiCard[] = [],
  strongestPairs: { colA: string; colB: string; coefficient: number }[] = []
): void {
  const wb = XLSX.utils.book_new();

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

  const recordsSheet = XLSX.utils.json_to_sheet(dataset.rows);
  XLSX.utils.book_append_sheet(wb, recordsSheet, 'Records');

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

  const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${cleanSlug(filename)}-cleaned.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ── 5. Executive Markdown Briefing (Programmatic Helper) ───────────────

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

/**
 * ExportModal.tsx
 *
 * Elite Boardroom Export Hub & Dossier Studio
 *
 * Formats Supported:
 * 1. 📄 Executive PDF Dossier (A4 Landscape / Portrait, custom headers, page numbering, classification)
 * 2. 📊 Multi-Sheet Excel Workbook (.xlsx) with XLSX (KPI summary, cleaned data, correlations)
 * 3. 💾 RFC-4180 Cleaned CSV (UTF-8 BOM, filtered active rows)
 * 4. 🖼️ Ultra-HD 2x Retina PNG Snapshot (High DPI presentation graphics)
 * 5. 📋 Markdown Executive Briefing (Direct clipboard copy or .md download)
 *
 * React Concepts Demonstrated:
 * ─ Multi-tab state machine with smooth transition animations
 * ─ Dynamic form controls for report branding and confidentiality metadata
 * ─ Direct client-side file synthesis using Blobs, canvas rendering, and xlsx
 * ─ Non-blocking async feedback loops with real-time status spinners and toasts
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileText,
  Image,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileCode,
  Copy,
  Check,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  exportDashboardAsPdf,
  exportDashboardAsPng,
  exportDatasetAsExcel,
  exportRowsAsCsv,
  generateExecutiveMarkdownBriefing,
  DEFAULT_REPORT_CUSTOMIZATION,
  type ReportCustomization,
} from '../engine/exporter';
import type { DatasetSchema, KpiCard } from '../types/dataset';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: DatasetSchema;
  kpis?: KpiCard[];
}

type ExportTab = 'pdf' | 'excel' | 'csv' | 'png' | 'markdown';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  dataset,
  kpis = [],
}) => {
  const [activeTab, setActiveTab] = useState<ExportTab>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useModalAccessibility(isOpen, onClose);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  // PDF Dossier Customization State
  const [pdfConfig, setPdfConfig] = useState<ReportCustomization>({
    ...DEFAULT_REPORT_CUSTOMIZATION,
    title: `${dataset.name} — Executive Briefing`,
  });

  useEffect(() => {
    setPdfConfig((prev) => ({
      ...prev,
      title: `${dataset.name} — Executive Briefing`,
    }));
  }, [dataset.name]);

  if (!isOpen) return null;

  const handleExportPdf = async () => {
    const printableArea = document.getElementById('dashboard-printable-area');
    if (!printableArea) {
      setError('Could not locate dashboard printable container.');
      return;
    }
    setIsExporting(true);
    setError(null);
    setExportSuccess(null);

    try {
      await exportDashboardAsPdf(printableArea, dataset.name, pdfConfig);
      setExportSuccess('Executive PDF Dossier compiled & downloaded successfully!');
      setTimeout(() => {
        setIsExporting(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'PDF Generation failed.');
      setIsExporting(false);
    }
  };

  const handleExportPng = async () => {
    const printableArea = document.getElementById('dashboard-printable-area');
    if (!printableArea) {
      setError('Could not locate dashboard printable container.');
      return;
    }
    setIsExporting(true);
    setError(null);
    setExportSuccess(null);

    try {
      await exportDashboardAsPng(printableArea, dataset.name, 2);
      setExportSuccess('High-Resolution 2x Retina PNG downloaded!');
      setTimeout(() => {
        setIsExporting(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'PNG Snapshot failed.');
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    try {
      setIsExporting(true);
      setError(null);
      exportDatasetAsExcel(dataset, kpis);
      setExportSuccess('Multi-Sheet Excel Workbook (.xlsx) downloaded!');
      setTimeout(() => {
        setIsExporting(false);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Excel export failed.');
      setIsExporting(false);
    }
  };

  const handleExportCsv = () => {
    try {
      setIsExporting(true);
      setError(null);
      exportRowsAsCsv(dataset.rows, dataset.name);
      setExportSuccess(`Cleaned CSV (${dataset.rows.length} rows) downloaded!`);
      setTimeout(() => {
        setIsExporting(false);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'CSV export failed.');
      setIsExporting(false);
    }
  };

  const handleCopyMarkdown = () => {
    const md = generateExecutiveMarkdownBriefing(dataset, kpis);
    navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = generateExecutiveMarkdownBriefing(dataset, kpis);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${dataset.slug}-briefing.md`;
    link.click();
    URL.revokeObjectURL(link.href);
    setExportSuccess('Markdown briefing downloaded!');
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-modal-title"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-[#0f0f13] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] focus:outline-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#14141a]/90">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="export-modal-title" className="text-sm font-semibold text-white tracking-tight">
                    Executive Export Hub
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
                    5 Formats
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Export live telemetry, visualizations, or datasets for {dataset.name}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isExporting}
              aria-label="Close modal"
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Format Tabs */}
          <div className="flex items-center border-b border-zinc-800/80 bg-zinc-950/60 px-6 overflow-x-auto text-xs font-medium">
            <button
              onClick={() => setActiveTab('pdf')}
              className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'pdf'
                  ? 'border-blue-500 text-white font-semibold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Executive PDF</span>
            </button>
            <button
              onClick={() => setActiveTab('excel')}
              className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'excel'
                  ? 'border-emerald-500 text-white font-semibold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Excel Workbook (.xlsx)</span>
            </button>
            <button
              onClick={() => setActiveTab('csv')}
              className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'csv'
                  ? 'border-cyan-500 text-white font-semibold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Filtered CSV</span>
            </button>
            <button
              onClick={() => setActiveTab('png')}
              className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'png'
                  ? 'border-purple-500 text-white font-semibold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Image className="w-4 h-4 text-purple-400" />
              <span>Retina PNG (2x)</span>
            </button>
            <button
              onClick={() => setActiveTab('markdown')}
              className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'markdown'
                  ? 'border-amber-500 text-white font-semibold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileCode className="w-4 h-4 text-amber-400" />
              <span>Markdown Memo</span>
            </button>
          </div>

          {/* Modal Content by Tab */}
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {activeTab === 'pdf' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Boardroom Dossier Engine:</span> Multi-page A4 document with auto-pagination, executive metadata header, and confidentiality classification banner.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1.5">
                      Dossier Title
                    </label>
                    <input
                      type="text"
                      value={pdfConfig.title}
                      onChange={(e) => setPdfConfig({ ...pdfConfig, title: e.target.value })}
                      className="w-full text-xs bg-zinc-900 border border-zinc-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1.5">
                      Prepared For (Recipient)
                    </label>
                    <input
                      type="text"
                      value={pdfConfig.preparedFor}
                      onChange={(e) => setPdfConfig({ ...pdfConfig, preparedFor: e.target.value })}
                      className="w-full text-xs bg-zinc-900 border border-zinc-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Board of Directors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1.5">
                      Page Orientation
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPdfConfig({ ...pdfConfig, orientation: 'landscape' })}
                        className={`text-xs py-2 px-3 rounded-lg border font-medium transition-all ${
                          pdfConfig.orientation === 'landscape'
                            ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-750 hover:text-white'
                        }`}
                      >
                        Landscape (16:9 Deck)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfConfig({ ...pdfConfig, orientation: 'portrait' })}
                        className={`text-xs py-2 px-3 rounded-lg border font-medium transition-all ${
                          pdfConfig.orientation === 'portrait'
                            ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-750 hover:text-white'
                        }`}
                      >
                        Portrait (A4 Dossier)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1.5">
                      Confidentiality Classification
                    </label>
                    <select
                      value={pdfConfig.classification}
                      onChange={(e) =>
                        setPdfConfig({
                          ...pdfConfig,
                          classification: e.target.value as ReportCustomization['classification'],
                        })
                      }
                      className="w-full text-xs bg-zinc-900 border border-zinc-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Internal Only">INTERNAL ONLY</option>
                      <option value="Confidential">CONFIDENTIAL & PROPRIETARY</option>
                      <option value="Restricted">BOARD RESTRICTED</option>
                      <option value="Public">PUBLIC RELEASE</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleExportPdf}
                    disabled={isExporting}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm shadow-blue-500/20"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{isExporting ? 'Vectorizing Charts & Compiling PDF...' : 'Download Executive PDF Dossier'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'excel' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Multi-Sheet Workbook Architecture:</span> Generates a structured `.xlsx` spreadsheet formatted with 3 dedicated sheets:
                    <ul className="list-disc ml-4 mt-1.5 text-zinc-300 space-y-1">
                      <li><strong>Sheet 1: Executive Summary</strong> — Core KPI cards and dataset metadata</li>
                      <li><strong>Sheet 2: Records</strong> — All active filtered rows ({dataset.rows.length.toLocaleString()} rows)</li>
                      <li><strong>Sheet 3: Statistical Correlations</strong> — Pearson coefficient matrix pairs</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-xs space-y-2">
                  <div className="flex justify-between text-zinc-400">
                    <span>Exporting Records:</span>
                    <span className="font-mono text-white font-semibold">{dataset.rows.length.toLocaleString()} rows</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Column Attributes:</span>
                    <span className="font-mono text-white font-semibold">{dataset.columnCount} columns</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Calculated Formulas:</span>
                    <span className="font-mono text-emerald-400 font-semibold">Included</span>
                  </div>
                </div>

                <button
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm shadow-emerald-500/20"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Excel Workbook (.xlsx)</span>
                </button>
              </div>
            )}

            {activeTab === 'csv' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-start gap-2.5">
                  <Layers className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">RFC-4180 Cleaned CSV:</span> Exports the currently filtered records ({dataset.rows.length.toLocaleString()} rows) with automated field escaping and UTF-8 Byte Order Mark (BOM) to guarantee clean formatting in Excel.
                  </div>
                </div>

                <button
                  onClick={handleExportCsv}
                  disabled={isExporting}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm shadow-cyan-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Cleaned CSV ({dataset.rows.length.toLocaleString()} rows)</span>
                </button>
              </div>
            )}

            {activeTab === 'png' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-start gap-2.5">
                  <Image className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Ultra-HD 2x Retina Snapshot:</span> Crisp raster snapshot rendered at double resolution (2x DPI). Optimized for Keynote/PowerPoint slides, Slack executive briefings, and newsletters.
                  </div>
                </div>

                <button
                  onClick={handleExportPng}
                  disabled={isExporting}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm shadow-purple-500/20"
                >
                  <Image className="w-4 h-4" />
                  <span>{isExporting ? 'Capturing 2x Canvas...' : 'Download 2x Retina Snapshot (PNG)'}</span>
                </button>
              </div>
            )}

            {activeTab === 'markdown' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                  <FileCode className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Markdown Executive Briefing:</span> Pre-formatted executive text summary with bullet points, KPI cards, and dimensional profile ready for pasting into email memos, Notion, or Slack.
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 max-h-48 overflow-y-auto font-mono text-[11px] text-zinc-300 whitespace-pre-wrap select-all">
                  {generateExecutiveMarkdownBriefing(dataset, kpis)}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCopyMarkdown}
                    className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-zinc-700"
                  >
                    {copiedMarkdown ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMarkdown ? 'Copied to Clipboard!' : 'Copy Markdown'}</span>
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download (.md)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Status Notifications */}
            {isExporting && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2.5">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Processing high-fidelity export payload...</span>
              </div>
            )}

            {exportSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{exportSuccess}</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

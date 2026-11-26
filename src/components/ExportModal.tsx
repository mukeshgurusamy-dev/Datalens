import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Sun,
  Moon,
  Check,
} from 'lucide-react';
import {
  exportFlexiblePdf,
  exportDatasetAsExcel,
  exportRowsAsCsv,
  DEFAULT_REPORT_CUSTOMIZATION,
  type ReportCustomization,
} from '../engine/exporter';
import { computeCorrelationMatrix } from '../engine/worker-tasks';
import type {
  ChartRecommendation,
  DataFilterState,
  DatasetSchema,
  KpiCard,
} from '../types/dataset';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: DatasetSchema;
  kpis?: KpiCard[];
  charts?: ChartRecommendation[];
  filters?: DataFilterState;
  totalRowCount?: number;
}

type ExportTab = 'pdf' | 'excel' | 'csv';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  dataset,
  kpis = [],
  charts = [],
  filters,
  totalRowCount,
}) => {
  const [activeTab, setActiveTab] = useState<ExportTab>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useModalAccessibility(isOpen, onClose);

  const [config, setConfig] = useState<ReportCustomization>({
    ...DEFAULT_REPORT_CUSTOMIZATION,
    title: dataset.name ? `${dataset.name} - Executive Report` : 'Executive Analytics Report',
    selectedChartIds: charts.map((c) => c.id),
  });

  // Sync default title and chart selection when dataset or charts change
  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      title: dataset.name ? `${dataset.name} - Executive Report` : 'Executive Analytics Report',
      selectedChartIds: charts.map((c) => c.id),
    }));
  }, [dataset.id, dataset.name, charts]);

  if (!isOpen) return null;

  const selectedChartSet = new Set(config.selectedChartIds ?? charts.map((c) => c.id));
  const numericColCount = dataset.columns.filter((c) => c.type === 'number').length;

  const toggleChartId = (id: string) => {
    const next = new Set(selectedChartSet);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setConfig((prev) => ({ ...prev, selectedChartIds: Array.from(next) }));
  };

  const applyPreset = (preset: 'full' | 'visuals') => {
    if (preset === 'full') {
      setConfig((prev) => ({
        ...prev,
        includeHeader: true,
        includeFilterScope: true,
        includeKpis: true,
        includeCharts: true,
        selectedChartIds: charts.map((c) => c.id),
        includeColumnStats: true,
        includeCorrelation: true,
        includeDataSample: true,
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        includeHeader: true,
        includeFilterScope: true,
        includeKpis: true,
        includeCharts: true,
        selectedChartIds: charts.map((c) => c.id),
        includeColumnStats: false,
        includeCorrelation: false,
        includeDataSample: false,
      }));
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    setError(null);
    setExportSuccess(null);

    try {
      await exportFlexiblePdf({
        dataset,
        kpis,
        charts,
        filters,
        totalRowCount,
        config,
      });
      setExportSuccess('Executive PDF Report downloaded!');
    } catch (err: any) {
      setError(err.message || 'Failed to generate PDF report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    setError(null);
    setExportSuccess(null);

    try {
      const numericCols = dataset.columns.filter((c) => c.type === 'number').map((c) => c.name);
      const pairs =
        numericCols.length >= 2
          ? computeCorrelationMatrix(dataset.rows, numericCols).strongestPairs
          : [];
      exportDatasetAsExcel(dataset, kpis, pairs);
      setExportSuccess('Multi-sheet Excel workbook (.xlsx) downloaded!');
    } catch (err: any) {
      setError(err.message || 'Failed to generate Excel workbook');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = () => {
    setIsExporting(true);
    setError(null);
    setExportSuccess(null);

    try {
      exportRowsAsCsv(dataset.rows, dataset.name);
      setExportSuccess(`Filtered CSV (${dataset.rows.length.toLocaleString()} rows) downloaded!`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate CSV file');
    } finally {
      setIsExporting(false);
    }
  };

  const sectionToggles: {
    key: keyof Pick<
      ReportCustomization,
      | 'includeHeader'
      | 'includeFilterScope'
      | 'includeKpis'
      | 'includeCharts'
      | 'includeColumnStats'
      | 'includeCorrelation'
      | 'includeDataSample'
    >;
    label: string;
    disabled?: boolean;
  }[] = [
    { key: 'includeHeader', label: 'Header & Metadata' },
    { key: 'includeFilterScope', label: 'Active Filter Scope' },
    { key: 'includeKpis', label: `KPI Cards (${kpis.length})` },
    { key: 'includeCharts', label: `Charts (${charts.length})`, disabled: charts.length === 0 },
    { key: 'includeColumnStats', label: `Column Stats (${dataset.columnCount})` },
    { key: 'includeCorrelation', label: 'Correlations', disabled: numericColCount < 2 },
    { key: 'includeDataSample', label: 'Data Sample Table' },
  ];

  const includedSummary: string[] = [];
  if (config.includeHeader) includedSummary.push('Header');
  if (config.includeFilterScope) includedSummary.push('Filter Scope');
  if (config.includeKpis && kpis.length > 0) includedSummary.push(`${kpis.length} KPIs`);
  if (config.includeCharts && selectedChartSet.size > 0) {
    includedSummary.push(`${selectedChartSet.size} Charts`);
  }
  if (config.includeColumnStats) includedSummary.push(`${dataset.columnCount} Col Stats`);
  if (config.includeCorrelation && numericColCount >= 2) includedSummary.push('Correlations');
  if (config.includeDataSample) includedSummary.push(`${config.dataSampleLimit} Sample Rows`);
  if (config.customNotes?.trim()) includedSummary.push('Notes');

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
          className="w-full max-w-3xl bg-[#0f0f13] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] focus:outline-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#14141a]/90">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 id="export-modal-title" className="text-sm font-semibold text-white tracking-tight">
                  Export Report &amp; Data
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Export customized PDF reports or raw filtered data for {dataset.name}
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
              className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'pdf'
                  ? 'border-blue-500 text-white font-semibold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span>PDF Report</span>
            </button>
            <button
              onClick={() => setActiveTab('excel')}
              className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'excel'
                  ? 'border-emerald-500 text-white font-semibold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Excel (.xlsx)</span>
            </button>
            <button
              onClick={() => setActiveTab('csv')}
              className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'csv'
                  ? 'border-cyan-500 text-white font-semibold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Filtered CSV</span>
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {activeTab === 'pdf' && (
              <div className="space-y-5">
                {/* Report Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">
                      Report Title
                    </label>
                    <input
                      type="text"
                      value={config.title}
                      onChange={(e) => setConfig({ ...config, title: e.target.value })}
                      className="w-full text-xs bg-zinc-900 border border-zinc-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">
                      Prepared For
                    </label>
                    <input
                      type="text"
                      value={config.preparedFor || ''}
                      onChange={(e) => setConfig({ ...config, preparedFor: e.target.value })}
                      className="w-full text-xs bg-zinc-900 border border-zinc-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Executive Leadership"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      value={config.subtitle || ''}
                      onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                      className="w-full text-xs bg-zinc-900 border border-zinc-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">
                      Classification
                    </label>
                    <select
                      value={config.classification}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          classification: e.target.value as ReportCustomization['classification'],
                        })
                      }
                      className="w-full text-xs bg-zinc-900 border border-zinc-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Internal Only">INTERNAL ONLY</option>
                      <option value="Confidential">CONFIDENTIAL</option>
                      <option value="Restricted">RESTRICTED</option>
                      <option value="Public">PUBLIC</option>
                    </select>
                  </div>
                </div>

                {/* Page & Theme Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">
                      Report Theme
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, theme: 'dark' })}
                        className={`text-xs py-2 px-2.5 rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-all ${
                          config.theme === 'dark'
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-750 hover:text-white'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        <span>Dark</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, theme: 'light' })}
                        className={`text-xs py-2 px-2.5 rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-all ${
                          config.theme === 'light'
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-750 hover:text-white'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>Light</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">
                      Orientation
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, orientation: 'landscape' })}
                        className={`text-xs py-2 px-2 rounded-lg border font-medium transition-all ${
                          config.orientation === 'landscape'
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-750 hover:text-white'
                        }`}
                      >
                        Landscape
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, orientation: 'portrait' })}
                        className={`text-xs py-2 px-2 rounded-lg border font-medium transition-all ${
                          config.orientation === 'portrait'
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-750 hover:text-white'
                        }`}
                      >
                        Portrait
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">
                      Paper Size
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, paperSize: 'a4' })}
                        className={`text-xs py-2 px-2 rounded-lg border font-medium transition-all ${
                          config.paperSize === 'a4'
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-750 hover:text-white'
                        }`}
                      >
                        A4
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, paperSize: 'letter' })}
                        className={`text-xs py-2 px-2 rounded-lg border font-medium transition-all ${
                          config.paperSize === 'letter'
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-750 hover:text-white'
                        }`}
                      >
                        Letter
                      </button>
                    </div>
                  </div>
                </div>

                {/* Included Sections Builder */}
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-400 uppercase">
                      Sections Included in PDF
                    </span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => applyPreset('full')}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Full Dossier
                      </button>
                      <span className="text-zinc-600">•</span>
                      <button
                        type="button"
                        onClick={() => applyPreset('visuals')}
                        className="text-zinc-400 hover:text-white font-medium"
                      >
                        Visuals Only
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {sectionToggles.map((item) => {
                      const checked = Boolean(config[item.key]) && !item.disabled;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          disabled={item.disabled}
                          onClick={() => setConfig({ ...config, [item.key]: !config[item.key] })}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                            checked
                              ? 'bg-blue-600/15 border-blue-500/40 text-blue-300'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3 text-blue-400" />}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Individual Chart Selector */}
                  {config.includeCharts && charts.length > 0 && (
                    <div className="pt-2 border-t border-zinc-800/80">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-2">
                        Select Individual Charts
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {charts.map((c) => {
                          const isSelected = selectedChartSet.has(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggleChartId(c.id)}
                              className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                                isSelected
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              {c.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Data Sample Row Count Selector */}
                  {config.includeDataSample && (
                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Data Sample Row Limit:</span>
                      <div className="flex items-center gap-1.5">
                        {([10, 25, 50] as const).map((limit) => (
                          <button
                            key={limit}
                            type="button"
                            onClick={() => setConfig({ ...config, dataSampleLimit: limit })}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
                              config.dataSampleLimit === limit
                                ? 'bg-blue-600 text-white border-blue-500'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {limit} rows
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Analyst Notes */}
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">
                    Analyst Commentary &amp; Takeaways (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={config.customNotes || ''}
                    onChange={(e) => setConfig({ ...config, customNotes: e.target.value })}
                    placeholder="Add executive summary notes, key findings, or recommendations to embed in the PDF..."
                    className="w-full text-xs bg-zinc-900 border border-zinc-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Live Summary + Export Button */}
                <div className="space-y-2.5">
                  <div className="text-[11px] font-mono text-zinc-400 bg-zinc-900/40 border border-zinc-800/80 rounded-lg px-3 py-2">
                    Included:{' '}
                    <span className="text-zinc-200">
                      {includedSummary.length > 0 ? includedSummary.join(' • ') : 'No sections selected'}
                    </span>
                  </div>
                  <button
                    onClick={handleExportPdf}
                    disabled={isExporting || includedSummary.length === 0}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm shadow-blue-500/20"
                  >
                    <FileText className="w-4 h-4" />
                    <span>
                      {isExporting ? 'Compiling Vector PDF...' : 'Download Executive PDF Report'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'excel' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Multi-Sheet Workbook Architecture:</span> Generates a structured `.xlsx` spreadsheet with Executive Summary, Filtered Records ({dataset.rows.length.toLocaleString()} rows), and Pearson Correlations.
                  </div>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-xs space-y-2">
                  <div className="flex justify-between text-zinc-400">
                    <span>Exporting Records:</span>
                    <span className="font-mono text-white font-semibold">
                      {dataset.rows.length.toLocaleString()} rows
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Column Attributes:</span>
                    <span className="font-mono text-white font-semibold">
                      {dataset.columnCount} columns
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
                    <span className="font-semibold text-white">RFC-4180 Cleaned CSV:</span> Exports all {dataset.rows.length.toLocaleString()} active filtered records with UTF-8 BOM encoding.
                  </div>
                </div>

                <button
                  onClick={handleExportCsv}
                  disabled={isExporting}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Layers className="w-4 h-4" />
                  <span>Download Cleaned CSV ({dataset.rows.length.toLocaleString()} rows)</span>
                </button>
              </div>
            )}

            {/* Status Banners */}
            {exportSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{exportSuccess}</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

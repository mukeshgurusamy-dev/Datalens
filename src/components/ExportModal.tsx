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
  buildFilterScopeItems,
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
import { FLUID_SPRING } from './MotionPrimitives';

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
  const scopeItems = buildFilterScopeItems(dataset, filters, totalRowCount);

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
      setExportSuccess('Executive PDF Report downloaded.');
    } catch (err: any) {
      setError(err.message || 'Failed to generate PDF report.');
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
      setExportSuccess('Excel workbook (.xlsx) downloaded.');
    } catch (err: any) {
      setError(err.message || 'Failed to generate Excel workbook.');
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
      setExportSuccess(`Filtered CSV (${dataset.rows.length.toLocaleString()} rows) downloaded.`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate CSV file.');
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

  const hasAnySection =
    config.includeHeader ||
    config.includeFilterScope ||
    (config.includeKpis && kpis.length > 0) ||
    (config.includeCharts && selectedChartSet.size > 0) ||
    config.includeColumnStats ||
    (config.includeCorrelation && numericColCount >= 2) ||
    config.includeDataSample ||
    Boolean(config.customNotes?.trim());

  const isPreviewDark = config.theme === 'dark';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-modal-title"
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] focus:outline-none pb-safe sm:pb-0"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3
                  id="export-modal-title"
                  className="text-sm font-semibold text-[var(--text-primary)] tracking-tight truncate"
                >
                  Export Report &amp; Data
                </h3>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {dataset.name} • {dataset.rowCount.toLocaleString()} active rows
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Segmented Format Switcher */}
              <div className="hidden sm:inline-flex items-center bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg p-0.5 text-xs font-medium">
                {(
                  [
                    { id: 'pdf', label: 'PDF Report', Icon: FileText },
                    { id: 'excel', label: 'Excel (.xlsx)', Icon: FileSpreadsheet },
                    { id: 'csv', label: 'Filtered CSV', Icon: Layers },
                  ] as const
                ).map(({ id, label, Icon }) => {
                  const isActive = activeTab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveTab(id)}
                      className={`relative inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                        isActive
                          ? 'text-[var(--text-primary)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="export-tab-pill"
                          transition={FLUID_SPRING}
                          className="absolute inset-0 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)]"
                        />
                      )}
                      <Icon className="w-3.5 h-3.5 relative z-10" />
                      <span className="relative z-10">{label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={onClose}
                disabled={isExporting}
                aria-label="Close modal"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-surface)] transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Format Tabs */}
          <div className="flex sm:hidden items-center border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 text-xs font-medium">
            {(['pdf', 'excel', 'csv'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-2.5 px-3 border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-muted)]'
                }`}
              >
                {tab === 'pdf' ? 'PDF Report' : tab === 'excel' ? 'Excel (.xlsx)' : 'Filtered CSV'}
              </button>
            ))}
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto flex-1">
            {activeTab === 'pdf' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column: Controls */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Metadata Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-[var(--text-muted)] uppercase block mb-1">
                        Report Title
                      </label>
                      <input
                        type="text"
                        value={config.title}
                        onChange={(e) => setConfig({ ...config, title: e.target.value })}
                        className="w-full text-xs bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-[var(--text-muted)] uppercase block mb-1">
                        Prepared For
                      </label>
                      <input
                        type="text"
                        value={config.preparedFor || ''}
                        onChange={(e) => setConfig({ ...config, preparedFor: e.target.value })}
                        placeholder="e.g. Executive Leadership"
                        className="w-full text-xs bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-[var(--text-muted)] uppercase block mb-1">
                        Subtitle
                      </label>
                      <input
                        type="text"
                        value={config.subtitle || ''}
                        onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                        className="w-full text-xs bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-[var(--text-muted)] uppercase block mb-1">
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
                        className="w-full text-xs bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="Internal Only">Internal Only</option>
                        <option value="Confidential">Confidential</option>
                        <option value="Restricted">Restricted</option>
                        <option value="Public">Public</option>
                      </select>
                    </div>
                  </div>

                  {/* Page Setup */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[11px] font-mono text-[var(--text-muted)] uppercase block mb-1">
                        Theme
                      </label>
                      <div className="grid grid-cols-2 gap-1 bg-[var(--bg-elevated)] p-0.5 rounded-lg border border-[var(--border-hairline)]">
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, theme: 'dark' })}
                          className={`text-xs py-1.5 rounded-md font-medium flex items-center justify-center gap-1 transition-colors ${
                            config.theme === 'dark'
                              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)]'
                              : 'text-[var(--text-muted)] border border-transparent'
                          }`}
                        >
                          <Moon className="w-3 h-3" />
                          <span>Dark</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, theme: 'light' })}
                          className={`text-xs py-1.5 rounded-md font-medium flex items-center justify-center gap-1 transition-colors ${
                            config.theme === 'light'
                              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)]'
                              : 'text-[var(--text-muted)] border border-transparent'
                          }`}
                        >
                          <Sun className="w-3 h-3" />
                          <span>Light</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-[var(--text-muted)] uppercase block mb-1">
                        Orientation
                      </label>
                      <div className="grid grid-cols-2 gap-1 bg-[var(--bg-elevated)] p-0.5 rounded-lg border border-[var(--border-hairline)]">
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, orientation: 'landscape' })}
                          className={`text-xs py-1.5 rounded-md font-medium transition-colors ${
                            config.orientation === 'landscape'
                              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)]'
                              : 'text-[var(--text-muted)] border border-transparent'
                          }`}
                        >
                          Wide
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, orientation: 'portrait' })}
                          className={`text-xs py-1.5 rounded-md font-medium transition-colors ${
                            config.orientation === 'portrait'
                              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)]'
                              : 'text-[var(--text-muted)] border border-transparent'
                          }`}
                        >
                          Tall
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-[var(--text-muted)] uppercase block mb-1">
                        Paper
                      </label>
                      <div className="grid grid-cols-2 gap-1 bg-[var(--bg-elevated)] p-0.5 rounded-lg border border-[var(--border-hairline)]">
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, paperSize: 'a4' })}
                          className={`text-xs py-1.5 rounded-md font-medium transition-colors ${
                            config.paperSize === 'a4'
                              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)]'
                              : 'text-[var(--text-muted)] border border-transparent'
                          }`}
                        >
                          A4
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, paperSize: 'letter' })}
                          className={`text-xs py-1.5 rounded-md font-medium transition-colors ${
                            config.paperSize === 'letter'
                              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)]'
                              : 'text-[var(--text-muted)] border border-transparent'
                          }`}
                        >
                          Letter
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Included Sections */}
                  <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase">
                        Report Sections
                      </span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => applyPreset('full')}
                          className="text-blue-500 hover:underline font-medium"
                        >
                          Full Dossier
                        </button>
                        <span className="text-[var(--text-muted)]">/</span>
                        <button
                          type="button"
                          onClick={() => applyPreset('visuals')}
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium"
                        >
                          Visuals Only
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {sectionToggles.map((item) => {
                        const checked = Boolean(config[item.key]) && !item.disabled;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            disabled={item.disabled}
                            onClick={() => setConfig({ ...config, [item.key]: !config[item.key] })}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                              checked
                                ? 'bg-blue-600/15 border-blue-500/40 text-blue-400'
                                : 'bg-[var(--bg-surface)] border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {checked && <Check className="w-3 h-3" />}
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {config.includeCharts && charts.length > 0 && (
                      <div className="pt-2 border-t border-[var(--border-hairline)]">
                        <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block mb-1.5">
                          Select Charts
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {charts.map((c) => {
                            const isSelected = selectedChartSet.has(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => toggleChartId(c.id)}
                                className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                                  isSelected
                                    ? 'bg-[var(--bg-surface)] border-[var(--border-strong)] text-[var(--text-primary)]'
                                    : 'bg-transparent border-[var(--border-hairline)] text-[var(--text-muted)] opacity-60 hover:opacity-100'
                                }`}
                              >
                                {c.title}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {config.includeDataSample && (
                      <div className="pt-2 border-t border-[var(--border-hairline)] flex items-center justify-between text-xs">
                        <span className="text-[var(--text-muted)]">Sample Row Limit</span>
                        <div className="flex items-center gap-1">
                          {([10, 25, 50] as const).map((limit) => (
                            <button
                              key={limit}
                              type="button"
                              onClick={() => setConfig({ ...config, dataSampleLimit: limit })}
                              className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                                config.dataSampleLimit === limit
                                  ? 'bg-blue-600 text-white border-blue-500'
                                  : 'bg-[var(--bg-surface)] border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              {limit}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Analyst Notes */}
                  <div>
                    <label className="text-[11px] font-mono text-[var(--text-muted)] uppercase block mb-1">
                      Analyst Commentary (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={config.customNotes || ''}
                      onChange={(e) => setConfig({ ...config, customNotes: e.target.value })}
                      placeholder="Add executive summary notes or takeaways..."
                      className="w-full text-xs bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none transition-colors"
                    />
                  </div>
                </div>

                {/* Right Column: Live Document Blueprint Preview */}
                <div className="lg:col-span-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                    <span>LIVE DOCUMENT PREVIEW</span>
                    <span>
                      {config.paperSize.toUpperCase()} • {config.orientation.toUpperCase()}
                    </span>
                  </div>

                  <div
                    className={`rounded-xl border p-4 space-y-3 transition-colors ${
                      isPreviewDark
                        ? 'bg-[#09090b] border-zinc-800 text-zinc-100'
                        : 'bg-[#f8fafc] border-slate-200 text-slate-900'
                    }`}
                  >
                    {/* Preview Header */}
                    {config.includeHeader && (
                      <div
                        className={`pb-2.5 border-b flex items-start justify-between gap-2 ${
                          isPreviewDark ? 'border-zinc-800' : 'border-slate-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">
                            {config.title || dataset.name}
                          </div>
                          {config.subtitle && (
                            <div
                              className={`text-[10px] truncate ${
                                isPreviewDark ? 'text-zinc-400' : 'text-slate-500'
                              }`}
                            >
                              {config.subtitle}
                            </div>
                          )}
                        </div>
                        {config.classification && (
                          <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500 text-white shrink-0">
                            {config.classification}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Preview Filter Scope */}
                    {config.includeFilterScope && (
                      <div
                        className={`text-[10px] font-mono px-2 py-1.5 rounded border truncate ${
                          isPreviewDark
                            ? 'bg-[#121215] border-zinc-800 text-zinc-400'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        {scopeItems.join(' | ')}
                      </div>
                    )}

                    {/* Preview KPIs */}
                    {config.includeKpis && kpis.length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5">
                        {kpis.slice(0, 4).map((k) => (
                          <div
                            key={k.id}
                            className={`p-2 rounded border ${
                              isPreviewDark
                                ? 'bg-[#121215] border-zinc-800'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div
                              className={`text-[9px] uppercase truncate ${
                                isPreviewDark ? 'text-zinc-400' : 'text-slate-500'
                              }`}
                            >
                              {k.title}
                            </div>
                            <div className="text-xs font-mono font-semibold tabular-nums">
                              {k.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Preview Charts */}
                    {config.includeCharts && selectedChartSet.size > 0 && (
                      <div className="grid grid-cols-2 gap-1.5">
                        {charts
                          .filter((c) => selectedChartSet.has(c.id))
                          .slice(0, 4)
                          .map((c) => (
                            <div
                              key={c.id}
                              className={`p-2 rounded border text-[10px] truncate ${
                                isPreviewDark
                                  ? 'bg-[#121215] border-zinc-800 text-zinc-300'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              Chart: {c.title}
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Preview Tables & Notes Indicators */}
                    <div className="space-y-1.5 text-[10px] font-mono">
                      {config.includeColumnStats && (
                        <div
                          className={`px-2 py-1.5 rounded border ${
                            isPreviewDark
                              ? 'bg-[#121215] border-zinc-800 text-zinc-400'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          Schema &amp; Stats Table ({dataset.columnCount} columns)
                        </div>
                      )}
                      {config.includeCorrelation && numericColCount >= 2 && (
                        <div
                          className={`px-2 py-1.5 rounded border ${
                            isPreviewDark
                              ? 'bg-[#121215] border-zinc-800 text-zinc-400'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          Pearson Correlations Matrix
                        </div>
                      )}
                      {config.includeDataSample && (
                        <div
                          className={`px-2 py-1.5 rounded border ${
                            isPreviewDark
                              ? 'bg-[#121215] border-zinc-800 text-zinc-400'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          Data Sample ({Math.min(config.dataSampleLimit, dataset.rowCount)} rows)
                        </div>
                      )}
                      {config.customNotes?.trim() && (
                        <div
                          className={`px-2 py-1.5 rounded border italic truncate ${
                            isPreviewDark
                              ? 'bg-[#121215] border-zinc-800 text-zinc-400'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          Notes: {config.customNotes.trim()}
                        </div>
                      )}
                    </div>

                    {/* Preview Footer */}
                    <div
                      className={`pt-2 border-t flex justify-between text-[9px] font-mono ${
                        isPreviewDark
                          ? 'border-zinc-800 text-zinc-500'
                          : 'border-slate-200 text-slate-400'
                      }`}
                    >
                      <span>DataLens Analytics</span>
                      <span>Page 1 of N</span>
                    </div>
                  </div>

                  <button
                    onClick={handleExportPdf}
                    disabled={isExporting || !hasAnySection}
                    className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    <span>
                      {isExporting ? 'Compiling PDF...' : 'Download Executive PDF Report'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'excel' && (
              <div className="max-w-lg mx-auto py-4 space-y-4">
                <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <span>Multi-Sheet Excel Workbook (.xlsx)</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Generates a structured workbook with Executive Summary, Filtered Records ({dataset.rows.length.toLocaleString()} rows), and Pearson Correlations.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-xs space-y-2 font-mono">
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Active Rows</span>
                    <span className="text-[var(--text-primary)] font-semibold tabular-nums">
                      {dataset.rows.length.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Columns</span>
                    <span className="text-[var(--text-primary)] font-semibold tabular-nums">
                      {dataset.columnCount}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Excel Workbook (.xlsx)</span>
                </button>
              </div>
            )}

            {activeTab === 'csv' && (
              <div className="max-w-lg mx-auto py-4 space-y-4">
                <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                    <Layers className="w-4 h-4 text-blue-500" />
                    <span>RFC-4180 Cleaned CSV</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Exports all {dataset.rows.length.toLocaleString()} active filtered records with UTF-8 BOM encoding for clean Excel compatibility.
                  </p>
                </div>

                <button
                  onClick={handleExportCsv}
                  disabled={isExporting}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Layers className="w-4 h-4" />
                  <span>Download Cleaned CSV ({dataset.rows.length.toLocaleString()} rows)</span>
                </button>
              </div>
            )}

            {/* Status Banners */}
            {exportSuccess && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{exportSuccess}</span>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import { useState, useMemo, useEffect, useTransition, Profiler, type ProfilerOnRenderCallback } from 'react';
import { Header } from './components/Header';
import { Dropzone } from './components/Dropzone';
import { FilterBar } from './components/FilterBar';
import { KpiRow } from './components/KpiRow';
import { ChartGrid } from './components/ChartGrid';
import { ChartCustomizer } from './components/ChartCustomizer';
import { ExportModal } from './components/ExportModal';
import { ShareModal } from './components/ShareModal';
import { DataTable } from './components/DataTable';
import { AiBriefing } from './components/AiBriefing';
import { PerformanceHud } from './components/PerformanceHud';
import { TimeTravelDrawer } from './components/TimeTravelDrawer';
import { CardErrorBoundary } from './components/CardErrorBoundary';
import { SqlStudioModal } from './components/SqlStudioModal';
import { ScenarioSimulator } from './components/ScenarioSimulator';
import { FormulaStudioModal } from './components/FormulaStudioModal';
import { TimelineBrush } from './components/TimelineBrush';
import { CorrelationMatrix } from './components/CorrelationMatrix';
import { buildChartRecommendations, aggregateChartData } from './engine/recommender';
import { filterRows } from './engine/filter';
import { deriveFilteredSchema } from './engine/profiler';
import { decodeDashboardState, reconstructDatasetFromPayload } from './engine/permalink';
import { buildPersonaKpiCards, type ExecutiveLens } from './engine/personas';
import { telemetryStore } from './engine/telemetry-store';
import { historyStore, type DashboardSnapshot } from './engine/history-store';
import type { DatasetSchema, DataFilterState, ChartRecommendation } from './types/dataset';
import { Layers, RefreshCw } from 'lucide-react';

export function App() {
  const [dataset, setDataset] = useState<DatasetSchema | null>(null);
  const [customCharts, setCustomCharts] = useState<Record<string, ChartRecommendation>>({});
  const [editingChart, setEditingChart] = useState<ChartRecommendation | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isSqlStudioOpen, setIsSqlStudioOpen] = useState(false);
  const [isFormulaStudioOpen, setIsFormulaStudioOpen] = useState(false);
  const [persona, setPersona] = useState<ExecutiveLens>('cfo');

  // React 19 Concurrent Transition hook for non-blocking UI rendering
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState<DataFilterState>({
    searchQuery: '',
    selectedCategories: {},
  });

  // Restore shared dashboard permalink from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#share=')) {
      const encoded = hash.replace('#share=', '');
      const payload = decodeDashboardState(encoded);
      if (payload) {
        const restoredDataset = reconstructDatasetFromPayload(payload);
        setDataset(restoredDataset);
        const restoredFilters = payload.filters || { searchQuery: '', selectedCategories: {} };
        const restoredCharts = payload.customCharts || {};
        setFilters(restoredFilters);
        setCustomCharts(restoredCharts);
        historyStore.init({
          label: 'Shared Dashboard Link',
          timestamp: Date.now(),
          filters: restoredFilters,
          customCharts: restoredCharts,
          persona: 'cfo',
        });
      }
    }
  }, []);

  // Initialize history when a new dataset is loaded
  const handleDatasetLoaded = (newDataset: DatasetSchema) => {
    const initialFilters = { searchQuery: '', selectedCategories: {} };
    historyStore.init({
      label: `Loaded ${newDataset.name}`,
      timestamp: Date.now(),
      filters: initialFilters,
      customCharts: {},
      persona: 'cfo',
    });
    setFilters(initialFilters);
    setCustomCharts({});
    setEditingChart(null);
    setDataset(newDataset);
  };

  // Find date column name if one exists
  const dateColumnName = useMemo(() => {
    return dataset?.columns.find((c) => c.type === 'date')?.name;
  }, [dataset]);

  // Synchronized row filtering across the dataset
  const filteredRows = useMemo(() => {
    if (!dataset) return [];
    return filterRows(dataset.rows, filters, dateColumnName);
  }, [dataset, filters, dateColumnName]);

  // Active dataset schema derived from filtered rows (with dynamically recalculated metrics)
  const activeDataset: DatasetSchema | null = useMemo(() => {
    if (!dataset) return null;
    return deriveFilteredSchema(dataset, filteredRows);
  }, [dataset, filteredRows]);

  // Re-computed KPI Cards from filtered data tailored to active executive persona (CFO / COO / CMO)
  const kpis = useMemo(() => {
    return activeDataset ? buildPersonaKpiCards(activeDataset, persona) : [];
  }, [activeDataset, persona]);

  // Filter change dispatcher with Concurrent Transition scheduling & History push
  const handleFilterChange = (nextFilters: DataFilterState | ((prev: DataFilterState) => DataFilterState)) => {
    const resolved = typeof nextFilters === 'function' ? nextFilters(filters) : nextFilters;
    historyStore.push('Updated Filters', {
      filters: resolved,
      customCharts,
      persona,
    });
    startTransition(() => {
      setFilters(resolved);
    });
  };

  // Interactive direct cross-filtering from clicking chart bars or slices
  const handleCrossFilter = (colName: string, value: string) => {
    const current = filters.selectedCategories[colName] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    const nextFilters: DataFilterState = {
      ...filters,
      selectedCategories: {
        ...filters.selectedCategories,
        [colName]: updated,
      },
    };

    historyStore.push(`Cross-Filtered ${colName}: ${value}`, {
      filters: nextFilters,
      customCharts,
      persona,
    });

    startTransition(() => {
      setFilters(nextFilters);
    });
  };

  // Persona change dispatcher with Concurrent Transition scheduling
  const handlePersonaChange = (nextPersona: ExecutiveLens) => {
    historyStore.push(`Switched to ${nextPersona.toUpperCase()} Lens`, {
      filters,
      customCharts,
      persona: nextPersona,
    });
    startTransition(() => {
      setPersona(nextPersona);
    });
  };

  // Re-computed charts, merged with user customizations and dynamically aggregated from filtered activeDataset
  const charts = useMemo(() => {
    if (!activeDataset) return [];
    const base = buildChartRecommendations(activeDataset);
    const mapped = base.map((c) => {
      const custom = customCharts[c.id];
      if (!custom) return c;

      const type = custom.type || c.type;
      const xAxis = custom.xAxis || c.xAxis;
      const yAxis = custom.yAxis || c.yAxis;
      const title = custom.title || `${yAxis} by ${xAxis}`;

      // Dynamically aggregate datapoints for customized dimensions from active filtered rows!
      const data = aggregateChartData(
        activeDataset.rows,
        xAxis,
        yAxis,
        type,
        activeDataset.columns
      );

      return {
        ...c,
        type,
        xAxis,
        yAxis,
        title,
        data,
      };
    });

    // Include dynamically created charts (e.g. from SQL Studio)
    const extraCustomCharts = Object.values(customCharts).filter((c) => !base.some((b) => b.id === c.id));
    return [...mapped, ...extraCustomCharts];
  }, [activeDataset, customCharts]);

  const activeEditingChart = useMemo(() => {
    if (!editingChart) return null;
    return charts.find((c) => c.id === editingChart.id) || editingChart;
  }, [charts, editingChart]);

  const handleUpdateChart = (updated: ChartRecommendation) => {
    const updatedCharts = {
      ...customCharts,
      [updated.id]: updated,
    };
    historyStore.push(`Customized ${updated.title}`, {
      filters,
      customCharts: updatedCharts,
      persona,
    });
    startTransition(() => {
      setCustomCharts(updatedCharts);
      setEditingChart(updated);
    });
  };

  const handleAddCustomChart = (newChart: ChartRecommendation) => {
    const updatedCharts = {
      ...customCharts,
      [newChart.id]: newChart,
    };
    historyStore.push(`Added SQL Chart: ${newChart.title}`, {
      filters,
      customCharts: updatedCharts,
      persona,
    });
    startTransition(() => {
      setCustomCharts(updatedCharts);
    });
  };

  // Time-travel snapshot restorer
  const handleRestoreSnapshot = (snapshot: DashboardSnapshot) => {
    startTransition(() => {
      setFilters(snapshot.filters);
      setCustomCharts(snapshot.customCharts);
      setPersona(snapshot.persona);
    });
  };

  // Formula Studio: dynamically append a calculated column to the live dataset
  const handleAddFormulaColumn = (columnName: string, values: (number | string)[]) => {
    if (!dataset) return;
    const isNumeric = values.every((v) => typeof v === 'number');
    const numericValues = isNumeric ? values.map(Number) : [];
    const newColumn: import('./types/dataset').ColumnProfile = {
      name: columnName,
      type: isNumeric ? 'number' : 'text',
      nullableCount: 0,
      uniqueCount: new Set(values.map(String)).size,
      ...(isNumeric && numericValues.length > 0 ? {
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        mean: numericValues.reduce((s, v) => s + v, 0) / numericValues.length,
        sum: numericValues.reduce((s, v) => s + v, 0),
      } : {}),
    };
    const newRows = dataset.rows.map((row, i) => ({
      ...row,
      [columnName]: values[i] ?? null,
    }));
    const filteredExistingCols = dataset.columns.filter(
      (c) => c.name.toLowerCase() !== columnName.toLowerCase()
    );
    setDataset({
      ...dataset,
      columns: [...filteredExistingCols, newColumn],
      columnCount: filteredExistingCols.length + 1,
      rows: newRows,
    });
  };

  const handleReset = () => {
    setDataset(null);
    setCustomCharts({});
    setEditingChart(null);
    setIsExportModalOpen(false);
    setIsShareModalOpen(false);
    setFilters({ searchQuery: '', selectedCategories: {} });
    historyStore.clear();
    window.location.hash = '';
  };

  // React Native Profiler callback tracking fiber commits only on dashboard area
  const handleProfilerRender: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    if (id === 'DataLensCanvas') {
      telemetryStore.recordCommit({
        id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col font-sans">
      <Header
        dataset={dataset}
        onReset={handleReset}
        onExport={() => setIsExportModalOpen(true)}
        onShare={() => setIsShareModalOpen(true)}
        activePersona={persona}
        onPersonaChange={handlePersonaChange}
        isTelemetryOpen={isTelemetryOpen}
        onToggleTelemetry={() => setIsTelemetryOpen(!isTelemetryOpen)}
        onOpenSqlStudio={() => setIsSqlStudioOpen(true)}
        onOpenFormulaStudio={() => setIsFormulaStudioOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {!dataset ? (
          <Dropzone onDatasetLoaded={handleDatasetLoaded} />
        ) : (
          <div>
            {/* Top Insight Badge with Concurrent Transition indicator */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-zinc-800/80">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {dataset.name}
                  </h1>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                    Live Analysis
                  </span>
                  {isPending && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Transitioning...
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400">
                  Profiled {dataset.rowCount.toLocaleString()} records across {dataset.columnCount} columns.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    {dataset.columns.filter((c) => c.type === 'number').length} Numeric,{' '}
                    {dataset.columns.filter((c) => c.type === 'category').length} Categories
                  </span>
                </div>
              </div>
            </div>

            {/* Global Interactive Filter Ribbon (Ignored in PDF/PNG export) */}
            <div data-export-ignore="true">
              <FilterBar
                columns={dataset.columns}
                filters={filters}
                onFilterChange={handleFilterChange}
                totalRowCount={dataset.rowCount}
                filteredRowCount={filteredRows.length}
              />
            </div>

            {/* Interactive Timeline Brush & Drag-Zoom (for date-indexed datasets) */}
            {dateColumnName && (
              <div data-export-ignore="true">
                <CardErrorBoundary fallbackTitle="Timeline Brush Anomaly">
                  <TimelineBrush
                    dataset={dataset}
                    dateColumnName={dateColumnName}
                    onRangeChange={(startDate, endDate) => {
                      handleFilterChange((prev) => ({
                        ...prev,
                        dateRange: startDate && endDate ? { start: startDate, end: endDate } : undefined,
                      }));
                    }}
                  />
                </CardErrorBoundary>
              </div>
            )}

            {/* Printable & Exportable Canvas Container wrapped in targeted Profiler */}
            <Profiler id="DataLensCanvas" onRender={handleProfilerRender}>
              <div id="dashboard-printable-area" className="p-2 sm:p-4 rounded-2xl bg-[#09090b]">
                {/* Executive AI Briefing & Natural Language Insights */}
                {activeDataset && (
                  <CardErrorBoundary fallbackTitle="AI Briefing Anomaly">
                    <AiBriefing schema={activeDataset} />
                  </CardErrorBoundary>
                )}

                {/* Executive KPI Cards */}
                <CardErrorBoundary fallbackTitle="Executive KPI Anomaly">
                  <KpiRow cards={kpis} />
                </CardErrorBoundary>

                {/* Recommended Charts with Direct Interactive Cross-Filtering */}
                <CardErrorBoundary fallbackTitle="Visualization Engine Anomaly">
                  <ChartGrid
                    charts={charts}
                    onCustomizeChart={(c) => setEditingChart(c)}
                    onCrossFilter={handleCrossFilter}
                    activeFilters={filters.selectedCategories}
                  />
                </CardErrorBoundary>
              </div>
            </Profiler>

            {/* Raw Records Table with 60 FPS Virtual Grid & Pagination */}
            {activeDataset && (
              <>
                {/* Executive What-If Sensitivity Simulator */}
                <CardErrorBoundary fallbackTitle="Scenario Simulator Anomaly">
                  <ScenarioSimulator dataset={activeDataset} />
                </CardErrorBoundary>

                {/* Background Web Worker Statistical Correlation Matrix */}
                <CardErrorBoundary fallbackTitle="Correlation Matrix Anomaly">
                  <CorrelationMatrix dataset={activeDataset} />
                </CardErrorBoundary>

                <CardErrorBoundary fallbackTitle="Data Grid Anomaly">
                  <DataTable dataset={activeDataset} />
                </CardErrorBoundary>
              </>
            )}

            {/* Chart Customizer Slide-Over */}
            <ChartCustomizer
              chart={activeEditingChart}
              columns={dataset.columns}
              onClose={() => setEditingChart(null)}
              onUpdateChart={handleUpdateChart}
            />

            {/* Boardroom Export Modal */}
            <ExportModal
              isOpen={isExportModalOpen}
              onClose={() => setIsExportModalOpen(false)}
              dataset={activeDataset || dataset}
              kpis={kpis}
            />

            {/* Instant Permalinks Share Modal */}
            <ShareModal
              isOpen={isShareModalOpen}
              onClose={() => setIsShareModalOpen(false)}
              dataset={dataset}
              filters={filters}
              customCharts={customCharts}
            />

            {/* In-Memory SQL Query Studio */}
            <SqlStudioModal
              isOpen={isSqlStudioOpen}
              onClose={() => setIsSqlStudioOpen(false)}
              dataset={activeDataset || dataset}
              onAddChartToDashboard={handleAddCustomChart}
            />

            {/* Custom Formula Studio — Calculated Columns */}
            <FormulaStudioModal
              isOpen={isFormulaStudioOpen}
              onClose={() => setIsFormulaStudioOpen(false)}
              dataset={dataset}
              onAddColumn={handleAddFormulaColumn}
            />

            {/* Interactive Time-Travel History Drawer & Undo/Redo Engine */}
            <TimeTravelDrawer onRestoreSnapshot={handleRestoreSnapshot} />

            {/* React 19 Profiler & Telemetry HUD Overlay (Outside of Profiler) */}
            <PerformanceHud
              isOpen={isTelemetryOpen}
              onClose={() => setIsTelemetryOpen(false)}
              isPendingTransition={isPending}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-850 py-6 text-center text-xs text-zinc-500">
        <p>
          DataLens Engine — Built with React 19 Concurrent Architecture, TypeScript, Tailwind CSS & Motion
        </p>
      </footer>
    </div>
  );
}

export default App;

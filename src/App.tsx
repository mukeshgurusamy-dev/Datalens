import { useState, useCallback, lazy, Suspense, Profiler, type ProfilerOnRenderCallback } from 'react';
import { Header } from './components/Header';
import { Dropzone } from './components/Dropzone';
import { FilterBar } from './components/FilterBar';
import { KpiRow } from './components/KpiRow';
import { ChartGrid } from './components/ChartGrid';
import { DataTable } from './components/DataTable';
import { TimeTravelDrawer } from './components/TimeTravelDrawer';
import { CardErrorBoundary } from './components/CardErrorBoundary';
import { TimelineBrush } from './components/TimelineBrush';
import { useDashboardState } from './hooks/useDashboardState';
import { telemetryStore } from './engine/telemetry-store';
import { Layers, RefreshCw } from 'lucide-react';

// Lazy-loaded modals and secondary analytical panels to keep initial bundle lean
const ChartCustomizer = lazy(() =>
  import('./components/ChartCustomizer').then((m) => ({ default: m.ChartCustomizer }))
);
const ExportModal = lazy(() =>
  import('./components/ExportModal').then((m) => ({ default: m.ExportModal }))
);
const ShareModal = lazy(() =>
  import('./components/ShareModal').then((m) => ({ default: m.ShareModal }))
);
const SqlStudioModal = lazy(() =>
  import('./components/SqlStudioModal').then((m) => ({ default: m.SqlStudioModal }))
);
const FormulaStudioModal = lazy(() =>
  import('./components/FormulaStudioModal').then((m) => ({ default: m.FormulaStudioModal }))
);
const ShortcutsModal = lazy(() =>
  import('./components/ShortcutsModal').then((m) => ({ default: m.ShortcutsModal }))
);
const PerformanceHud = lazy(() =>
  import('./components/PerformanceHud').then((m) => ({ default: m.PerformanceHud }))
);
const ScenarioSimulator = lazy(() =>
  import('./components/ScenarioSimulator').then((m) => ({ default: m.ScenarioSimulator }))
);
const CorrelationMatrix = lazy(() =>
  import('./components/CorrelationMatrix').then((m) => ({ default: m.CorrelationMatrix }))
);

export function App() {
  const {
    dataset,
    activeDataset,
    dateColumnName,
    filteredRows,
    filters,
    kpis,
    charts,
    customCharts,
    activeEditingChart,
    persona,
    isPending,
    setEditingChart,
    handleDatasetLoaded,
    handleFilterChange,
    handleDateRangeChange,
    handleCrossFilter,
    handlePersonaChange,
    handleUpdateChart,
    handleAddCustomChart,
    handleRestoreSnapshot,
    handleAddFormulaColumn,
    handleReset: resetDashboardState,
  } = useDashboardState();

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isSqlStudioOpen, setIsSqlStudioOpen] = useState(false);
  const [isFormulaStudioOpen, setIsFormulaStudioOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const openExportModal = useCallback(() => setIsExportModalOpen(true), []);
  const closeExportModal = useCallback(() => setIsExportModalOpen(false), []);
  const openShareModal = useCallback(() => setIsShareModalOpen(true), []);
  const closeShareModal = useCallback(() => setIsShareModalOpen(false), []);
  const toggleTelemetry = useCallback(() => setIsTelemetryOpen((prev) => !prev), []);
  const closeTelemetry = useCallback(() => setIsTelemetryOpen(false), []);
  const openSqlStudio = useCallback(() => setIsSqlStudioOpen(true), []);
  const closeSqlStudio = useCallback(() => setIsSqlStudioOpen(false), []);
  const openFormulaStudio = useCallback(() => setIsFormulaStudioOpen(true), []);
  const closeFormulaStudio = useCallback(() => setIsFormulaStudioOpen(false), []);
  const openShortcuts = useCallback(() => setIsShortcutsOpen(true), []);
  const closeShortcuts = useCallback(() => setIsShortcutsOpen(false), []);
  const closeCustomizer = useCallback(() => setEditingChart(null), [setEditingChart]);

  const handleReset = useCallback(() => {
    setIsExportModalOpen(false);
    setIsShareModalOpen(false);
    resetDashboardState();
  }, [resetDashboardState]);

  // React Native Profiler callback tracking fiber commits only on dashboard area
  const handleProfilerRender: ProfilerOnRenderCallback = useCallback(
    (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
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
    },
    []
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col font-sans">
      <Header
        dataset={dataset}
        onReset={handleReset}
        onExport={openExportModal}
        onShare={openShareModal}
        activePersona={persona}
        onPersonaChange={handlePersonaChange}
        isTelemetryOpen={isTelemetryOpen}
        onToggleTelemetry={toggleTelemetry}
        onOpenSqlStudio={openSqlStudio}
        onOpenFormulaStudio={openFormulaStudio}
        onOpenShortcuts={openShortcuts}
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
                    onRangeChange={handleDateRangeChange}
                  />
                </CardErrorBoundary>
              </div>
            )}

            {/* Printable & Exportable Canvas Container wrapped in targeted Profiler */}
            <Profiler id="DataLensCanvas" onRender={handleProfilerRender}>
              <div id="dashboard-printable-area" className="p-2 sm:p-4 rounded-2xl bg-[#09090b]">
                {/* Executive KPI Cards */}
                <CardErrorBoundary fallbackTitle="Executive KPI Anomaly">
                  <KpiRow cards={kpis} />
                </CardErrorBoundary>

                {/* Recommended Charts with Direct Interactive Cross-Filtering */}
                <CardErrorBoundary fallbackTitle="Visualization Engine Anomaly">
                  <ChartGrid
                    charts={charts}
                    onCustomizeChart={setEditingChart}
                    onCrossFilter={handleCrossFilter}
                    activeFilters={filters.selectedCategories}
                  />
                </CardErrorBoundary>
              </div>
            </Profiler>

            {/* Secondary Analytical Panels & Raw Records Table */}
            {activeDataset && (
              <>
                <Suspense fallback={null}>
                  <CardErrorBoundary fallbackTitle="Scenario Simulator Anomaly">
                    <ScenarioSimulator dataset={activeDataset} />
                  </CardErrorBoundary>

                  <CardErrorBoundary fallbackTitle="Correlation Matrix Anomaly">
                    <CorrelationMatrix dataset={activeDataset} />
                  </CardErrorBoundary>
                </Suspense>

                <CardErrorBoundary fallbackTitle="Data Grid Anomaly">
                  <DataTable dataset={activeDataset} />
                </CardErrorBoundary>
              </>
            )}

            {/* Lazy-loaded Modals & Overlays */}
            <Suspense fallback={null}>
              {activeEditingChart && (
                <ChartCustomizer
                  chart={activeEditingChart}
                  columns={dataset.columns}
                  onClose={closeCustomizer}
                  onUpdateChart={handleUpdateChart}
                />
              )}

              {isExportModalOpen && (
                <ExportModal
                  isOpen={isExportModalOpen}
                  onClose={closeExportModal}
                  dataset={activeDataset || dataset}
                  kpis={kpis}
                  charts={charts}
                  filters={filters}
                  totalRowCount={dataset.rowCount}
                />
              )}

              {isShareModalOpen && (
                <ShareModal
                  isOpen={isShareModalOpen}
                  onClose={closeShareModal}
                  dataset={dataset}
                  filters={filters}
                  customCharts={customCharts}
                />
              )}

              {isSqlStudioOpen && (
                <SqlStudioModal
                  isOpen={isSqlStudioOpen}
                  onClose={closeSqlStudio}
                  dataset={activeDataset || dataset}
                  onAddChartToDashboard={handleAddCustomChart}
                />
              )}

              {isFormulaStudioOpen && (
                <FormulaStudioModal
                  isOpen={isFormulaStudioOpen}
                  onClose={closeFormulaStudio}
                  dataset={dataset}
                  onAddColumn={handleAddFormulaColumn}
                />
              )}

              {isTelemetryOpen && (
                <PerformanceHud
                  isOpen={isTelemetryOpen}
                  onClose={closeTelemetry}
                  isPendingTransition={isPending}
                />
              )}

              {isShortcutsOpen && (
                <ShortcutsModal
                  isOpen={isShortcutsOpen}
                  onClose={closeShortcuts}
                />
              )}
            </Suspense>

            {/* Interactive Time-Travel History Drawer & Undo/Redo Engine */}
            <TimeTravelDrawer onRestoreSnapshot={handleRestoreSnapshot} />
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

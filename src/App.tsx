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
import { LayoutGrid, Table2, SlidersHorizontal, RefreshCw } from 'lucide-react';

type WorkspaceTab = 'overview' | 'data' | 'modeling';

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

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
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
    setActiveTab('overview');
    resetDashboardState();
  }, [resetDashboardState]);

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
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col font-sans">
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {!dataset ? (
          <Dropzone onDatasetLoaded={handleDatasetLoaded} />
        ) : (
          <div>
            {/* Workspace Header + Sub-Navigation */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-4 border-b border-[var(--border-hairline)]">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
                    {dataset.name}
                  </h1>
                  {isPending && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-muted)] font-mono">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Updating
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
                  {filteredRows.length.toLocaleString()} of {dataset.rowCount.toLocaleString()} rows •{' '}
                  {dataset.columnCount} columns (
                  {dataset.columns.filter((c) => c.type === 'number').length} numeric,{' '}
                  {dataset.columns.filter((c) => c.type === 'category').length} categorical)
                </p>
              </div>

              {/* Workspace Tabs */}
              <nav
                aria-label="Workspace views"
                className="inline-flex items-center bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg p-1 text-xs font-medium self-start"
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-hairline)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Overview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('data')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    activeTab === 'data'
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-hairline)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent'
                  }`}
                >
                  <Table2 className="w-3.5 h-3.5" />
                  <span>Data Explorer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('modeling')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    activeTab === 'modeling'
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-hairline)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Modeling &amp; Matrix</span>
                </button>
              </nav>
            </div>

            {/* Global Filter Ribbon */}
            {(activeTab === 'overview' || activeTab === 'data') && (
              <div data-export-ignore="true">
                <FilterBar
                  columns={dataset.columns}
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  totalRowCount={dataset.rowCount}
                  filteredRowCount={filteredRows.length}
                />
              </div>
            )}

            {/* Overview Tab: Timeline Brush, KPIs, Visualizations */}
            {activeTab === 'overview' && (
              <>
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

                <Profiler id="DataLensCanvas" onRender={handleProfilerRender}>
                  <div id="dashboard-printable-area" className="rounded-xl">
                    <CardErrorBoundary fallbackTitle="Executive KPI Anomaly">
                      <KpiRow cards={kpis} />
                    </CardErrorBoundary>

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
              </>
            )}

            {/* Data Explorer Tab: 60 FPS Virtualized Table */}
            {activeTab === 'data' && activeDataset && (
              <CardErrorBoundary fallbackTitle="Data Grid Anomaly">
                <DataTable dataset={activeDataset} />
              </CardErrorBoundary>
            )}

            {/* Modeling & Matrix Tab: What-If Simulator & Correlation Matrix */}
            {activeTab === 'modeling' && activeDataset && (
              <Suspense fallback={null}>
                <div className="space-y-6">
                  <CardErrorBoundary fallbackTitle="Scenario Simulator Anomaly">
                    <ScenarioSimulator dataset={activeDataset} />
                  </CardErrorBoundary>

                  <CardErrorBoundary fallbackTitle="Correlation Matrix Anomaly">
                    <CorrelationMatrix dataset={activeDataset} />
                  </CardErrorBoundary>
                </div>
              </Suspense>
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

            {/* Interactive Time-Travel History Drawer */}
            <TimeTravelDrawer onRestoreSnapshot={handleRestoreSnapshot} />
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--border-hairline)] py-4 text-center text-xs text-[var(--text-muted)]">
        <p>DataLens — Browser-Native Analytics Studio</p>
      </footer>
    </div>
  );
}

export default App;

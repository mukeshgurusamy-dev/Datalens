import { useState, useCallback, useEffect, useLayoutEffect, useRef, lazy, Suspense, Profiler, type ProfilerOnRenderCallback } from 'react';
import { MotionConfig, motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { Dropzone } from './components/Dropzone';
import { CardErrorBoundary } from './components/CardErrorBoundary';
import { FLUID_SPRING } from './components/MotionPrimitives';
import { useDashboardState } from './hooks/useDashboardState';
import { telemetryStore } from './engine/telemetry-store';
import { scheduleIdlePrefetch } from './utils/performance';
import { LayoutGrid, Table2, SlidersHorizontal, RefreshCw } from 'lucide-react';

type WorkspaceTab = 'overview' | 'data' | 'modeling';

// Lazy-loaded workspace views so the initial landing page never parses Recharts (~488 kB) upfront
const FilterBar = lazy(() =>
  import('./components/FilterBar').then((m) => ({ default: m.FilterBar }))
);
const KpiRow = lazy(() =>
  import('./components/KpiRow').then((m) => ({ default: m.KpiRow }))
);
const ChartGrid = lazy(() =>
  import('./components/ChartGrid').then((m) => ({ default: m.ChartGrid }))
);
const DataTable = lazy(() =>
  import('./components/DataTable').then((m) => ({ default: m.DataTable }))
);
const TimeTravelDrawer = lazy(() =>
  import('./components/TimeTravelDrawer').then((m) => ({ default: m.TimeTravelDrawer }))
);
const TimelineBrush = lazy(() =>
  import('./components/TimelineBrush').then((m) => ({ default: m.TimelineBrush }))
);

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

  // Sync document title for browser tabs & JS-executing crawlers
  useEffect(() => {
    document.title = dataset
      ? `${dataset.name} — DataLens`
      : 'DataLens — Browser-Native Analytics Studio & Client-Side BI';
  }, [dataset]);

  // Pre-warm primary dashboard chunks during idle time after initial landing paint
  useEffect(() => {
    return scheduleIdlePrefetch(() => {
      void import('./components/FilterBar');
      void import('./components/KpiRow');
      void import('./components/ChartGrid');
      void import('./components/TimelineBrush');
    });
  }, []);

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

  const profilerFiredRef = useRef(false);
  const hasMountedCanvasRef = useRef(false);
  const renderStartTime = performance.now();

  const handleProfilerRender: ProfilerOnRenderCallback = useCallback(
    (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
      if (id === 'DataLensCanvas') {
        profilerFiredRef.current = true;
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

  // Production React strips <Profiler> callbacks; measure real commit duration as fallback
  useLayoutEffect(() => {
    if (!dataset || activeTab !== 'overview') {
      hasMountedCanvasRef.current = false;
      return;
    }
    if (profilerFiredRef.current) {
      profilerFiredRef.current = false;
      hasMountedCanvasRef.current = true;
      return;
    }
    const now = performance.now();
    const duration = Math.max(0.05, now - renderStartTime);
    const phase = hasMountedCanvasRef.current ? 'update' : 'mount';
    hasMountedCanvasRef.current = true;
    telemetryStore.recordCommit({
      id: 'DataLensCanvas',
      phase,
      actualDuration: duration,
      baseDuration: duration,
      startTime: renderStartTime,
      commitTime: now,
    });
  }, [dataset, activeDataset, kpis, charts, activeTab]);

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col font-sans">
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

      <main className="flex-1 max-w-[1800px] w-full mx-auto px-3 sm:px-6 py-5 sm:py-6">
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

              {/* Workspace Tabs with Shared-Element Fluid Pill */}
              <nav
                aria-label="Workspace views"
                className="inline-flex items-center bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg p-1 text-xs font-medium self-start max-w-full overflow-x-auto"
              >
                {(
                  [
                    { id: 'overview', label: 'Overview', Icon: LayoutGrid },
                    { id: 'data', label: 'Data Explorer', Icon: Table2 },
                    { id: 'modeling', label: 'Modeling & Matrix', Icon: SlidersHorizontal },
                  ] as const
                ).map(({ id, label, Icon }) => {
                  const isActive = activeTab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveTab(id)}
                      className={`relative inline-flex items-center gap-1.5 px-3 min-h-[36px] sm:min-h-0 sm:py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'text-[var(--text-primary)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="workspace-tab-pill"
                          transition={FLUID_SPRING}
                          className="absolute inset-0 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)]"
                        />
                      )}
                      <Icon className="w-3.5 h-3.5 relative z-10" />
                      <span className="relative z-10">{label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Global Filter Ribbon */}
            {(activeTab === 'overview' || activeTab === 'data') && (
              <div data-export-ignore="true">
                <Suspense fallback={<div className="h-[54px] mb-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] animate-pulse" />}>
                  <FilterBar
                    columns={dataset.columns}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    totalRowCount={dataset.rowCount}
                    filteredRowCount={filteredRows.length}
                  />
                </Suspense>
              </div>
            )}

            {/* Tab Content with Smooth Workspace Transition */}
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="tab-overview"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                >
                  {dateColumnName && (
                    <div data-export-ignore="true">
                      <CardErrorBoundary fallbackTitle="Timeline Brush Anomaly">
                        <Suspense fallback={<div className="h-[72px] mb-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] animate-pulse" />}>
                          <TimelineBrush
                            dataset={dataset}
                            dateColumnName={dateColumnName}
                            onRangeChange={handleDateRangeChange}
                          />
                        </Suspense>
                      </CardErrorBoundary>
                    </div>
                  )}

                  <Profiler id="DataLensCanvas" onRender={handleProfilerRender}>
                    <div id="dashboard-printable-area" className="rounded-xl">
                      <Suspense
                        fallback={
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="h-[108px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] animate-pulse" />
                              ))}
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {[0, 1].map((i) => (
                                <div key={i} className="h-[360px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] animate-pulse" />
                              ))}
                            </div>
                          </div>
                        }
                      >
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
                      </Suspense>
                    </div>
                  </Profiler>
                </motion.div>
              )}

              {activeTab === 'data' && activeDataset && (
                <motion.div
                  key="tab-data"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                >
                  <CardErrorBoundary fallbackTitle="Data Grid Anomaly">
                    <Suspense fallback={<div className="h-[520px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] animate-pulse" />}>
                      <DataTable dataset={activeDataset} />
                    </Suspense>
                  </CardErrorBoundary>
                </motion.div>
              )}

              {activeTab === 'modeling' && activeDataset && (
                <motion.div
                  key="tab-modeling"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                >
                  <Suspense fallback={<div className="h-[480px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] animate-pulse" />}>
                    <div className="space-y-6">
                      <CardErrorBoundary fallbackTitle="Scenario Simulator Anomaly">
                        <ScenarioSimulator dataset={activeDataset} />
                      </CardErrorBoundary>

                      <CardErrorBoundary fallbackTitle="Correlation Matrix Anomaly">
                        <CorrelationMatrix dataset={activeDataset} />
                      </CardErrorBoundary>
                    </div>
                  </Suspense>
                </motion.div>
              )}
            </AnimatePresence>

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
            <Suspense fallback={null}>
              <TimeTravelDrawer onRestoreSnapshot={handleRestoreSnapshot} />
            </Suspense>
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--border-hairline)] py-4 text-center text-xs text-[var(--text-muted)]">
        <p>DataLens — Browser-Native Analytics Studio</p>
      </footer>
    </div>
    </MotionConfig>
  );
}

export default App;

import { useState, useMemo, useEffect } from 'react';
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
import { buildChartRecommendations, aggregateChartData } from './engine/recommender';
import { filterRows } from './engine/filter';
import { deriveFilteredSchema } from './engine/profiler';
import { decodeDashboardState, reconstructDatasetFromPayload } from './engine/permalink';
import { buildPersonaKpiCards, type ExecutiveLens } from './engine/personas';
import type { DatasetSchema, DataFilterState, ChartRecommendation } from './types/dataset';
import { Layers } from 'lucide-react';

export function App() {
  const [dataset, setDataset] = useState<DatasetSchema | null>(null);
  const [customCharts, setCustomCharts] = useState<Record<string, ChartRecommendation>>({});
  const [editingChart, setEditingChart] = useState<ChartRecommendation | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [persona, setPersona] = useState<ExecutiveLens>('cfo');

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
        if (payload.filters) {
          setFilters(payload.filters);
        }
        if (payload.customCharts) {
          setCustomCharts(payload.customCharts);
        }
      }
    }
  }, []);

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

  // Interactive direct cross-filtering from clicking chart bars or slices
  const handleCrossFilter = (colName: string, value: string) => {
    const current = filters.selectedCategories[colName] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    setFilters((prev) => ({
      ...prev,
      selectedCategories: {
        ...prev.selectedCategories,
        [colName]: updated,
      },
    }));
  };

  // Re-computed charts, merged with user customizations and dynamically aggregated from filtered activeDataset
  const charts = useMemo(() => {
    if (!activeDataset) return [];
    const base = buildChartRecommendations(activeDataset);
    return base.map((c) => {
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
  }, [activeDataset, customCharts]);

  const activeEditingChart = useMemo(() => {
    if (!editingChart) return null;
    return charts.find((c) => c.id === editingChart.id) || editingChart;
  }, [charts, editingChart]);

  const handleUpdateChart = (updated: ChartRecommendation) => {
    setCustomCharts((prev) => ({
      ...prev,
      [updated.id]: updated,
    }));
    setEditingChart(updated);
  };

  const handleReset = () => {
    setDataset(null);
    setCustomCharts({});
    setEditingChart(null);
    setIsExportModalOpen(false);
    setIsShareModalOpen(false);
    setFilters({ searchQuery: '', selectedCategories: {} });
    window.location.hash = '';
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col font-sans">
      <Header
        dataset={dataset}
        onReset={handleReset}
        onExport={() => setIsExportModalOpen(true)}
        onShare={() => setIsShareModalOpen(true)}
        activePersona={persona}
        onPersonaChange={setPersona}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {!dataset ? (
          <Dropzone onDatasetLoaded={setDataset} />
        ) : (
          <div>
            {/* Top Insight Badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-zinc-800/80">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {dataset.name}
                  </h1>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                    Live Analysis
                  </span>
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
                onFilterChange={setFilters}
                totalRowCount={dataset.rowCount}
                filteredRowCount={filteredRows.length}
              />
            </div>

            {/* Printable & Exportable Canvas Container */}
            <div id="dashboard-printable-area" className="p-2 sm:p-4 rounded-2xl bg-[#09090b]">
              {/* Executive AI Briefing & Natural Language Insights */}
              {activeDataset && <AiBriefing schema={activeDataset} />}

              {/* Executive KPI Cards */}
              <KpiRow cards={kpis} />

              {/* Recommended Charts with Direct Interactive Cross-Filtering */}
              <ChartGrid
                charts={charts}
                onCustomizeChart={(c) => setEditingChart(c)}
                onCrossFilter={handleCrossFilter}
                activeFilters={filters.selectedCategories}
              />
            </div>

            {/* Raw Records Table */}
            {activeDataset && <DataTable dataset={activeDataset} />}

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
              datasetName={dataset.name}
            />

            {/* Instant Permalinks Share Modal */}
            <ShareModal
              isOpen={isShareModalOpen}
              onClose={() => setIsShareModalOpen(false)}
              dataset={dataset}
              filters={filters}
              customCharts={customCharts}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-850 py-6 text-center text-xs text-zinc-500">
        <p>
          DataLens Engine — Built with React 19, TypeScript, Tailwind CSS & Motion
        </p>
      </footer>
    </div>
  );
}

export default App;

import { useState, useMemo, useEffect, useTransition, useCallback } from 'react';
import { buildChartRecommendations, aggregateChartData } from '../engine/recommender';
import { filterRows } from '../engine/filter';
import { deriveFilteredSchema, computeNumericStats } from '../engine/profiler';
import { decodeDashboardState, reconstructDatasetFromPayload } from '../engine/permalink';
import { buildPersonaKpiCards, type ExecutiveLens } from '../engine/personas';
import { historyStore, type DashboardSnapshot } from '../engine/history-store';
import type {
  DatasetSchema,
  DataFilterState,
  ChartRecommendation,
  ColumnProfile,
} from '../types/dataset';

const EMPTY_FILTERS: DataFilterState = {
  searchQuery: '',
  selectedCategories: {},
};

/**
 * Encapsulates all dashboard data, filtering, persona lenses, chart customization,
 * time-travel history, and React 19 concurrent transition scheduling.
 */
export function useDashboardState() {
  const [dataset, setDataset] = useState<DatasetSchema | null>(null);
  const [customCharts, setCustomCharts] = useState<Record<string, ChartRecommendation>>({});
  const [editingChart, setEditingChart] = useState<ChartRecommendation | null>(null);
  const [persona, setPersona] = useState<ExecutiveLens>('cfo');
  const [filters, setFilters] = useState<DataFilterState>(EMPTY_FILTERS);
  const [isPending, startTransition] = useTransition();

  // Restore shared dashboard permalink from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#share=')) {
      const encoded = hash.replace('#share=', '');
      const payload = decodeDashboardState(encoded);
      if (payload) {
        const restoredDataset = reconstructDatasetFromPayload(payload);
        const restoredFilters = payload.filters || EMPTY_FILTERS;
        const restoredCharts = payload.customCharts || {};
        setDataset(restoredDataset);
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

  const dateColumnName = useMemo(() => {
    return dataset?.columns.find((c) => c.type === 'date')?.name;
  }, [dataset]);

  const filteredRows = useMemo(() => {
    if (!dataset) return [];
    return filterRows(dataset.rows, filters, dateColumnName);
  }, [dataset, filters, dateColumnName]);

  const activeDataset: DatasetSchema | null = useMemo(() => {
    if (!dataset) return null;
    return deriveFilteredSchema(dataset, filteredRows);
  }, [dataset, filteredRows]);

  const kpis = useMemo(() => {
    return activeDataset ? buildPersonaKpiCards(activeDataset, persona) : [];
  }, [activeDataset, persona]);

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

      const data = aggregateChartData(
        activeDataset.rows,
        xAxis,
        yAxis,
        type,
        activeDataset.columns
      );

      return { ...c, type, xAxis, yAxis, title, data };
    });

    const extraCustomCharts = Object.values(customCharts).filter(
      (c) => !base.some((b) => b.id === c.id)
    );
    return [...mapped, ...extraCustomCharts];
  }, [activeDataset, customCharts]);

  const activeEditingChart = useMemo(() => {
    if (!editingChart) return null;
    return charts.find((c) => c.id === editingChart.id) || editingChart;
  }, [charts, editingChart]);

  const handleDatasetLoaded = useCallback((newDataset: DatasetSchema) => {
    historyStore.init({
      label: `Loaded ${newDataset.name}`,
      timestamp: Date.now(),
      filters: EMPTY_FILTERS,
      customCharts: {},
      persona: 'cfo',
    });
    setFilters(EMPTY_FILTERS);
    setCustomCharts({});
    setEditingChart(null);
    setDataset(newDataset);
  }, []);

  const handleFilterChange = useCallback(
    (nextFilters: DataFilterState | ((prev: DataFilterState) => DataFilterState)) => {
      setFilters((prevFilters) => {
        const resolved = typeof nextFilters === 'function' ? nextFilters(prevFilters) : nextFilters;
        historyStore.push('Updated Filters', {
          filters: resolved,
          customCharts,
          persona,
        });
        return resolved;
      });
    },
    [customCharts, persona]
  );

  // Concurrent wrapper for filter changes triggered from FilterBar or TimelineBrush
  const dispatchFilterChange = useCallback(
    (nextFilters: DataFilterState | ((prev: DataFilterState) => DataFilterState)) => {
      startTransition(() => {
        handleFilterChange(nextFilters);
      });
    },
    [handleFilterChange]
  );

  const handleDateRangeChange = useCallback(
    (startDate: string, endDate: string) => {
      dispatchFilterChange((prev) => ({
        ...prev,
        dateRange: startDate && endDate ? { start: startDate, end: endDate } : undefined,
      }));
    },
    [dispatchFilterChange]
  );

  const handleCrossFilter = useCallback(
    (colName: string, value: string) => {
      startTransition(() => {
        setFilters((prev) => {
          const current = prev.selectedCategories[colName] || [];
          const updated = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];

          const nextFilters: DataFilterState = {
            ...prev,
            selectedCategories: {
              ...prev.selectedCategories,
              [colName]: updated,
            },
          };

          historyStore.push(`Cross-Filtered ${colName}: ${value}`, {
            filters: nextFilters,
            customCharts,
            persona,
          });
          return nextFilters;
        });
      });
    },
    [customCharts, persona]
  );

  const handlePersonaChange = useCallback(
    (nextPersona: ExecutiveLens) => {
      historyStore.push(`Switched to ${nextPersona.toUpperCase()} Lens`, {
        filters,
        customCharts,
        persona: nextPersona,
      });
      startTransition(() => {
        setPersona(nextPersona);
      });
    },
    [filters, customCharts]
  );

  const handleUpdateChart = useCallback(
    (updated: ChartRecommendation) => {
      const updatedCharts = { ...customCharts, [updated.id]: updated };
      historyStore.push(`Customized ${updated.title}`, {
        filters,
        customCharts: updatedCharts,
        persona,
      });
      startTransition(() => {
        setCustomCharts(updatedCharts);
        setEditingChart(updated);
      });
    },
    [customCharts, filters, persona]
  );

  const handleAddCustomChart = useCallback(
    (newChart: ChartRecommendation) => {
      const updatedCharts = { ...customCharts, [newChart.id]: newChart };
      historyStore.push(`Added SQL Chart: ${newChart.title}`, {
        filters,
        customCharts: updatedCharts,
        persona,
      });
      startTransition(() => {
        setCustomCharts(updatedCharts);
      });
    },
    [customCharts, filters, persona]
  );

  const handleRestoreSnapshot = useCallback((snapshot: DashboardSnapshot) => {
    startTransition(() => {
      setFilters(snapshot.filters);
      setCustomCharts(snapshot.customCharts);
      setPersona(snapshot.persona);
    });
  }, []);

  const handleAddFormulaColumn = useCallback(
    (columnName: string, values: (number | string)[]) => {
      setDataset((prev) => {
        if (!prev) return prev;
        const isNumeric = values.every((v) => typeof v === 'number');
        const numericValues = isNumeric ? values.map(Number) : [];
        const stats = isNumeric && numericValues.length > 0 ? computeNumericStats(numericValues) : {};
        const newColumn: ColumnProfile = {
          name: columnName,
          type: isNumeric ? 'number' : 'text',
          nullableCount: 0,
          uniqueCount: new Set(values.map(String)).size,
          ...(isNumeric && numericValues.length > 0
            ? {
                min: stats.min,
                max: stats.max,
                mean: stats.mean,
                sum: stats.sum,
              }
            : {}),
        };
        const newRows = prev.rows.map((row, i) => ({
          ...row,
          [columnName]: values[i] ?? null,
        }));
        const filteredExistingCols = prev.columns.filter(
          (c) => c.name.toLowerCase() !== columnName.toLowerCase()
        );
        return {
          ...prev,
          columns: [...filteredExistingCols, newColumn],
          columnCount: filteredExistingCols.length + 1,
          rows: newRows,
        };
      });
    },
    []
  );

  const handleReset = useCallback(() => {
    setDataset(null);
    setCustomCharts({});
    setEditingChart(null);
    setFilters(EMPTY_FILTERS);
    historyStore.clear();
    window.location.hash = '';
  }, []);

  return {
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
    handleFilterChange: dispatchFilterChange,
    handleDateRangeChange,
    handleCrossFilter,
    handlePersonaChange,
    handleUpdateChart,
    handleAddCustomChart,
    handleRestoreSnapshot,
    handleAddFormulaColumn,
    handleReset,
  };
}

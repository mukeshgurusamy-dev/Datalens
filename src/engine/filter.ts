import type { DataFilterState } from '../types/dataset';
import { normalizeDateKey } from './profiler';

/**
 * Pure deterministic filter engine for tabular records.
 * Supports multi-category filtering, date ranges, and full-text search.
 */
export function filterRows(
  rows: Record<string, any>[],
  filters: DataFilterState,
  dateColumnName?: string
): Record<string, any>[] {
  if (!rows || rows.length === 0) return [];

  const { searchQuery, dateRange, selectedCategories } = filters;
  const normalizedSearch = searchQuery?.trim().toLowerCase() || '';

  // Get active categorical filter entries (ignore empty arrays)
  const activeCategoryEntries = Object.entries(selectedCategories || {}).filter(
    ([_, values]) => values && values.length > 0
  );

  // Pre-normalize selected values for O(1) or fast case-insensitive checks
  const preparedCategories = activeCategoryEntries.map(([colName, vals]) => ({
    colName,
    selectedSet: new Set(vals.map((v) => String(v).trim().toLowerCase())),
  }));

  return rows.filter((row) => {
    // 1. Full-text search match across all cells
    if (normalizedSearch) {
      const rowMatches = Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        if (val instanceof Date) {
          return val.toISOString().toLowerCase().includes(normalizedSearch);
        }
        return String(val).toLowerCase().includes(normalizedSearch);
      });
      if (!rowMatches) return false;
    }

    // 2. Multi-category filter matching (AND across different columns, OR within same column)
    for (const { colName, selectedSet } of preparedCategories) {
      const rawCellVal = row[colName];
      if (rawCellVal === null || rawCellVal === undefined) {
        return false;
      }
      const cellVal = String(rawCellVal).trim().toLowerCase();
      if (!selectedSet.has(cellVal)) {
        return false;
      }
    }

    // 3. Date range match
    if (dateColumnName && dateRange && (dateRange.start || dateRange.end)) {
      const rawDate = row[dateColumnName];
      if (rawDate === null || rawDate === undefined || rawDate === '') {
        return false;
      }
      const cellDate = normalizeDateKey(rawDate);
      if (!cellDate) {
        return false;
      }
      if (dateRange.start && cellDate < dateRange.start) {
        return false;
      }
      if (dateRange.end && cellDate > dateRange.end) {
        return false;
      }
    }

    return true;
  });
}

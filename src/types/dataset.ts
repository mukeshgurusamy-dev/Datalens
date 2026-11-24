export type ColumnType = 'number' | 'date' | 'category' | 'text' | 'boolean' | 'id';

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  nullableCount: number;
  uniqueCount: number;
  min?: number;
  max?: number;
  mean?: number;
  sum?: number;
  topValues?: { value: string; count: number }[];
}

export interface DatasetSchema {
  id: string;
  name: string;
  slug: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  rows: Record<string, string | number | boolean | null>[];
  parsedAt: number;
}

export type ChartType = 'area' | 'line' | 'bar' | 'donut' | 'scatter';

export interface ChartRecommendation {
  id: string;
  type: ChartType;
  title: string;
  description: string;
  xAxis: string;
  yAxis: string;
  secondaryAxis?: string;
  data: Record<string, any>[];
}

export interface KpiCard {
  id: string;
  title: string;
  value: string;
  numericValue?: number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

export interface DataFilterState {
  searchQuery: string;
  dateRange?: { start?: string; end?: string };
  selectedCategories: Record<string, string[]>;
}

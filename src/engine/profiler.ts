import type { ColumnProfile, ColumnType, DatasetSchema } from '../types/dataset';
import { cleanSlug, unslugify } from './unslug';

const DATE_REGEX = /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/;

/**
 * Normalizes any date value (Date object, ISO 8601 string, or standard date) into YYYY-MM-DD.
 */
export function normalizeDateKey(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.length >= 10 && /^\d{4}[-/.]\d{2}[-/.]\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10).replace(/[/.]/g, '-');
    }
    const timestamp = Date.parse(trimmed);
    if (!isNaN(timestamp)) {
      return new Date(timestamp).toISOString().slice(0, 10);
    }
  }
  return String(val).slice(0, 10);
}

/**
 * Checks if a string or object value looks like a date.
 */
function isDateValue(val: unknown): boolean {
  if (val instanceof Date) return true;
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed.length < 8 || trimmed.length > 35) return false;
  if (DATE_REGEX.test(trimmed)) {
    const timestamp = Date.parse(trimmed);
    return !isNaN(timestamp);
  }
  return false;
}

/**
 * Cleans and converts a raw cell into a number if possible.
 * Handles currencies ($1,200, ₹45,000), percentages (45.2%), and commas.
 */
export function parseNumberValue(val: unknown): number | null {
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val !== 'string') return null;

  const trimmed = val.trim();
  if (!trimmed) return null;

  // Strip currency symbols and formatting commas
  const cleaned = trimmed.replace(/[$€£₹,]/g, '').replace(/%$/, '');
  const num = Number(cleaned);

  return isNaN(num) ? null : num;
}

/**
 * Profiles an array of raw row objects to detect column schemas and statistical metrics.
 */
export function profileDataset(
  name: string,
  rawRows: Record<string, any>[]
): DatasetSchema {
  if (!rawRows || rawRows.length === 0) {
    const slug = cleanSlug(name);
    return {
      id: crypto.randomUUID(),
      name: unslugify(slug),
      slug,
      rowCount: 0,
      columnCount: 0,
      columns: [],
      rows: [],
      parsedAt: Date.now(),
    };
  }

  const columnNames = Object.keys(rawRows[0] || {});
  const totalRows = rawRows.length;
  const sampleSize = Math.min(totalRows, 200); // Check up to 200 rows for type inference

  const columns: ColumnProfile[] = columnNames.map((colName) => {
    let numericCount = 0;
    let dateCount = 0;
    let booleanCount = 0;
    let nullCount = 0;

    const uniqueValues = new Set<any>();
    const numericValues: number[] = [];
    const frequencyMap: Record<string, number> = {};

    for (let i = 0; i < totalRows; i++) {
      const val = rawRows[i][colName];

      if (val === null || val === undefined || val === '') {
        nullCount++;
        continue;
      }

      uniqueValues.add(val);
      const strVal = String(val);
      frequencyMap[strVal] = (frequencyMap[strVal] || 0) + 1;

      // Sample check for type inference
      if (i < sampleSize) {
        if (typeof val === 'boolean' || val === 'true' || val === 'false') {
          booleanCount++;
        } else if (isDateValue(val)) {
          dateCount++;
        } else if (parseNumberValue(val) !== null) {
          numericCount++;
        }
      }

      // Collect numeric values for math
      const num = parseNumberValue(val);
      if (num !== null) {
        numericValues.push(num);
      }
    }

    const validSamples = sampleSize - nullCount;
    let type: ColumnType = 'text';

    if (validSamples > 0) {
      if (dateCount / validSamples > 0.7) {
        type = 'date';
      } else if (numericCount / validSamples > 0.7) {
        type = 'number';
      } else if (booleanCount / validSamples > 0.7) {
        type = 'boolean';
      } else if (/id|code|uuid|guid|key|hash/i.test(colName) && (uniqueValues.size === totalRows || uniqueValues.size > 50)) {
        type = 'id';
      } else if (uniqueValues.size <= 60 && (totalRows <= 10 || uniqueValues.size < totalRows)) {
        type = 'category';
      } else if ((uniqueValues.size / totalRows) < 0.05 && uniqueValues.size <= 100) {
        type = 'category';
      } else {
        type = 'text';
      }
    }

    // Top frequency distribution for categories (preserve all options up to 100)
    const topValues = Object.entries(frequencyMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([value, count]) => ({ value, count }));

    // Mathematical metrics for numeric columns
    let min: number | undefined;
    let max: number | undefined;
    let mean: number | undefined;
    let sum: number | undefined;

    if (type === 'number' && numericValues.length > 0) {
      min = Math.min(...numericValues);
      max = Math.max(...numericValues);
      sum = numericValues.reduce((acc, curr) => acc + curr, 0);
      mean = sum / numericValues.length;
    }

    return {
      name: colName,
      type,
      nullableCount: nullCount,
      uniqueCount: uniqueValues.size,
      min,
      max,
      mean,
      sum,
      topValues: type === 'category' || type === 'text' ? topValues : undefined,
    };
  });

  const slug = cleanSlug(name);

  return {
    id: crypto.randomUUID(),
    name: unslugify(slug),
    slug,
    rowCount: totalRows,
    columnCount: columnNames.length,
    columns,
    rows: rawRows,
    parsedAt: Date.now(),
  };
}

/**
 * Formats large metrics cleanly (e.g. 1420500 -> "$1.42M" or "1.42M").
 */
export function formatMetric(val: number, isCurrency = false): string {
  const prefix = isCurrency ? '$' : '';
  if (Math.abs(val) >= 1_000_000) {
    return `${prefix}${(Math.round((val / 1_000_000) * 100) / 100).toFixed(2)}M`;
  }
  if (Math.abs(val) >= 1_000) {
    return `${prefix}${(Math.round((val / 1_000) * 10) / 10).toFixed(1)}k`;
  }
  if (Number.isInteger(val)) {
    return `${prefix}${val.toLocaleString()}`;
  }
  return `${prefix}${val.toFixed(2)}`;
}

/**
 * Re-derives mathematical statistics and categorical distributions
 * for a filtered subset of rows, maintaining schema column definitions.
 */
export function deriveFilteredSchema(
  masterSchema: DatasetSchema,
  filteredRows: Record<string, any>[]
): DatasetSchema {
  if (filteredRows.length === masterSchema.rows.length) {
    return masterSchema;
  }

  const updatedColumns: ColumnProfile[] = masterSchema.columns.map((col) => {
    let nullCount = 0;
    const uniqueValues = new Set<any>();
    const numericValues: number[] = [];
    const frequencyMap: Record<string, number> = {};

    for (let i = 0; i < filteredRows.length; i++) {
      const val = filteredRows[i][col.name];
      if (val === null || val === undefined || val === '') {
        nullCount++;
        continue;
      }
      uniqueValues.add(val);
      const strVal = String(val).trim();
      frequencyMap[strVal] = (frequencyMap[strVal] || 0) + 1;

      if (col.type === 'number') {
        const num = parseNumberValue(val);
        if (num !== null) {
          numericValues.push(num);
        }
      }
    }

    const topValues = Object.entries(frequencyMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([value, count]) => ({ value, count }));

    let min: number | undefined;
    let max: number | undefined;
    let mean: number | undefined;
    let sum: number | undefined;

    if (col.type === 'number' && numericValues.length > 0) {
      min = Math.min(...numericValues);
      max = Math.max(...numericValues);
      sum = numericValues.reduce((acc, curr) => acc + curr, 0);
      mean = sum / numericValues.length;
    }

    return {
      ...col,
      nullableCount: nullCount,
      uniqueCount: uniqueValues.size,
      min,
      max,
      mean,
      sum,
      topValues: col.type === 'category' || col.type === 'text' ? topValues : undefined,
    };
  });

  return {
    ...masterSchema,
    rowCount: filteredRows.length,
    columns: updatedColumns,
    rows: filteredRows,
  };
}

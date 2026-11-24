import type { ChartRecommendation } from '../types/dataset';

export interface SqlQueryResult {
  columns: string[];
  rows: Record<string, any>[];
  executionTimeMs: number;
  rowCount: number;
  error?: string;
}

interface ParsedSelectField {
  raw: string;
  expression: string;
  alias: string;
  aggregation?: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
  arg?: string;
}

interface ParsedWhereClause {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
  value: any;
}

/**
 * Pure TypeScript In-Memory SQL Query Engine.
 * Supports SELECT, WHERE, GROUP BY, ORDER BY, and LIMIT with aggregations (SUM, AVG, COUNT, MIN, MAX).
 */
export function executeSqlQuery(sql: string, datasetRows: Record<string, any>[]): SqlQueryResult {
  const startTime = performance.now();

  try {
    const trimmed = sql.trim().replace(/;$/, '');
    if (!trimmed) {
      return { columns: [], rows: [], executionTimeMs: 0, rowCount: 0 };
    }

    // Tokenize clauses
    const selectMatch = trimmed.match(/SELECT\s+(.+?)(?:\s+FROM|\s+WHERE|\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (!selectMatch) {
      throw new Error('Syntax error: Query must start with SELECT');
    }

    const selectStr = selectMatch[1].trim();
    const whereMatch = trimmed.match(/\s+WHERE\s+(.+?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)/i);
    const groupByMatch = trimmed.match(/\s+GROUP\s+BY\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
    const orderByMatch = trimmed.match(/\s+ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i);
    const limitMatch = trimmed.match(/\s+LIMIT\s+(\d+)$/i);

    // 1. Parse SELECT fields
    const fields = parseSelectFields(selectStr);

    // 2. Filter rows (WHERE)
    let rows = [...datasetRows];
    if (whereMatch) {
      const whereConditions = parseWhereClause(whereMatch[1].trim());
      rows = rows.filter((row) => evaluateWhereConditions(row, whereConditions));
    }

    // 3. GROUP BY and Aggregations
    let finalRows: Record<string, any>[] = [];
    const hasAggregations = fields.some((f) => !!f.aggregation);

    if (groupByMatch) {
      const groupCols = groupByMatch[1].split(',').map((c) => c.trim().toLowerCase());
      const groups = new Map<string, { keyValues: Record<string, any>; rows: Record<string, any>[] }>();

      for (const row of rows) {
        const keyParts: string[] = [];
        const keyValues: Record<string, any> = {};

        for (const col of groupCols) {
          const actualCol = Object.keys(row).find((k) => k.toLowerCase() === col) || col;
          const val = row[actualCol];
          keyParts.push(String(val));
          keyValues[col] = val;
        }

        const groupKey = keyParts.join('___');
        if (!groups.has(groupKey)) {
          groups.set(groupKey, { keyValues, rows: [] });
        }
        groups.get(groupKey)!.rows.push(row);
      }

      for (const [, group] of groups) {
        const outRow: Record<string, any> = {};

        for (const f of fields) {
          if (f.aggregation) {
            outRow[f.alias] = computeAggregate(f.aggregation, f.arg, group.rows);
          } else {
            const actualCol = Object.keys(group.keyValues).find((k) => k.toLowerCase() === f.expression.toLowerCase());
            outRow[f.alias] = actualCol ? group.keyValues[actualCol] : group.rows[0]?.[f.expression];
          }
        }
        finalRows.push(outRow);
      }
    } else if (hasAggregations) {
      // Global aggregation across all rows
      const outRow: Record<string, any> = {};
      for (const f of fields) {
        if (f.aggregation) {
          outRow[f.alias] = computeAggregate(f.aggregation, f.arg, rows);
        } else {
          outRow[f.alias] = rows[0]?.[f.expression] ?? null;
        }
      }
      finalRows = [outRow];
    } else {
      // Direct projection
      finalRows = rows.map((row) => {
        if (selectStr === '*') return { ...row };

        const outRow: Record<string, any> = {};
        for (const f of fields) {
          const actualCol = Object.keys(row).find((k) => k.toLowerCase() === f.expression.toLowerCase()) || f.expression;
          outRow[f.alias] = row[actualCol];
        }
        return outRow;
      });
    }

    // 4. ORDER BY
    if (orderByMatch) {
      const orderParts = orderByMatch[1].trim().split(/\s+/);
      const orderCol = orderParts[0].toLowerCase();
      const isDesc = orderParts[1]?.toLowerCase() === 'desc';

      finalRows.sort((a, b) => {
        const keyA = Object.keys(a).find((k) => k.toLowerCase() === orderCol) || orderCol;
        const keyB = Object.keys(b).find((k) => k.toLowerCase() === orderCol) || orderCol;

        const valA = a[keyA];
        const valB = b[keyB];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return isDesc ? valB - valA : valA - valB;
        }
        return isDesc
          ? String(valB ?? '').localeCompare(String(valA ?? ''))
          : String(valA ?? '').localeCompare(String(valB ?? ''));
      });
    }

    // 5. LIMIT
    if (limitMatch) {
      const limit = parseInt(limitMatch[1], 10);
      if (!isNaN(limit)) {
        finalRows = finalRows.slice(0, limit);
      }
    }

    const columns = finalRows.length > 0 ? Object.keys(finalRows[0]) : fields.map((f) => f.alias);
    const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      columns,
      rows: finalRows,
      executionTimeMs,
      rowCount: finalRows.length,
    };
  } catch (err: any) {
    return {
      columns: [],
      rows: [],
      executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
      rowCount: 0,
      error: err.message || 'Error executing query',
    };
  }
}

function parseSelectFields(selectStr: string): ParsedSelectField[] {
  if (selectStr === '*') {
    return [{ raw: '*', expression: '*', alias: '*' }];
  }

  // Split by comma, respecting parentheses
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < selectStr.length; i++) {
    const char = selectStr[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;

    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());

  return parts.map((part) => {
    // Check for alias: expr AS alias or expr alias
    const asMatch = part.match(/^(.+?)\s+AS\s+([a-zA-Z0-9_]+)$/i) || part.match(/^(.+?)\s+([a-zA-Z0-9_]+)$/);
    let expression = part;
    let alias = part;

    if (asMatch) {
      expression = asMatch[1].trim();
      alias = asMatch[2].trim();
    }

    // Check for aggregation
    const aggMatch = expression.match(/^(SUM|AVG|COUNT|MIN|MAX)\((.+?)\)$/i);
    if (aggMatch) {
      const aggregation = aggMatch[1].toUpperCase() as 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
      const arg = aggMatch[2].trim();
      return {
        raw: part,
        expression,
        alias: asMatch ? alias : `${aggregation.toLowerCase()}_${arg.replace(/\*/g, 'all')}`,
        aggregation,
        arg,
      };
    }

    return {
      raw: part,
      expression,
      alias,
    };
  });
}

function computeAggregate(
  agg: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX',
  arg: string | undefined,
  rows: Record<string, any>[]
): number | null {
  if (!rows || rows.length === 0) return 0;
  if (agg === 'COUNT') return rows.length;

  if (!arg) return 0;
  const colName = arg.trim();

  const numbers: number[] = [];
  for (const r of rows) {
    const actualCol = Object.keys(r).find((k) => k.toLowerCase() === colName.toLowerCase()) || colName;
    const val = Number(r[actualCol]);
    if (!isNaN(val)) {
      numbers.push(val);
    }
  }

  if (numbers.length === 0) return 0;

  switch (agg) {
    case 'SUM':
      return Math.round(numbers.reduce((a, b) => a + b, 0) * 10000) / 10000;
    case 'AVG': {
      const sum = numbers.reduce((a, b) => a + b, 0);
      return Math.round((sum / numbers.length) * 10000) / 10000;
    }
    case 'MIN':
      return Math.min(...numbers);
    case 'MAX':
      return Math.max(...numbers);
    default:
      return 0;
  }
}

function parseWhereClause(whereStr: string): ParsedWhereClause[] {
  // Simple AND conjunctions
  const clauses = whereStr.split(/\s+AND\s+/i);
  const conditions: ParsedWhereClause[] = [];

  for (const c of clauses) {
    const match = c.match(/([a-zA-Z0-9_]+)\s*(=|!=|>=|<=|>|<|LIKE)\s*(.+)/i);
    if (match) {
      const column = match[1].trim();
      const operator = match[2].trim() as any;
      let rawVal = match[3].trim();

      // Strip surrounding quotes
      if ((rawVal.startsWith("'") && rawVal.endsWith("'")) || (rawVal.startsWith('"') && rawVal.endsWith('"'))) {
        rawVal = rawVal.slice(1, -1);
      }

      const numVal = Number(rawVal);
      const value = !isNaN(numVal) && !isNaN(parseFloat(rawVal)) ? numVal : rawVal;

      conditions.push({ column, operator, value });
    }
  }

  return conditions;
}

function evaluateWhereConditions(row: Record<string, any>, conditions: ParsedWhereClause[]): boolean {
  for (const cond of conditions) {
    const actualCol = Object.keys(row).find((k) => k.toLowerCase() === cond.column.toLowerCase()) || cond.column;
    const cellVal = row[actualCol];

    switch (cond.operator) {
      case '=':
        if (typeof cellVal === 'string' && typeof cond.value === 'string') {
          if (cellVal.toLowerCase() !== cond.value.toLowerCase()) return false;
        } else if (cellVal != cond.value) {
          return false;
        }
        break;
      case '!=':
        if (cellVal == cond.value) return false;
        break;
      case '>':
        if (Number(cellVal) <= Number(cond.value)) return false;
        break;
      case '<':
        if (Number(cellVal) >= Number(cond.value)) return false;
        break;
      case '>=':
        if (Number(cellVal) < Number(cond.value)) return false;
        break;
      case '<=':
        if (Number(cellVal) > Number(cond.value)) return false;
        break;
      case 'LIKE': {
        const pattern = String(cond.value).replace(/%/g, '.*');
        const regex = new RegExp(`^${pattern}$`, 'i');
        if (!regex.test(String(cellVal ?? ''))) return false;
        break;
      }
    }
  }
  return true;
}

/**
 * Transforms a SQL Query result into an interactive ChartRecommendation ready to mount on the dashboard.
 */
export function convertSqlResultToChart(
  result: SqlQueryResult,
  queryTitle: string = 'Custom SQL Query'
): ChartRecommendation | null {
  if (result.rows.length === 0 || result.columns.length < 2) {
    return null;
  }

  const cols = result.columns;
  let xAxis = cols[0];
  let yAxis = cols[1];

  // Try to find first numeric column for yAxis, and string/date for xAxis
  const firstRow = result.rows[0];
  const numCol = cols.find((c) => typeof firstRow[c] === 'number');
  const catCol = cols.find((c) => typeof firstRow[c] !== 'number');

  if (numCol && catCol) {
    xAxis = catCol;
    yAxis = numCol;
  }

  const chartType = result.rows.length <= 8 ? 'donut' : 'bar';

  return {
    id: `sql-chart-${Date.now()}`,
    type: chartType,
    title: `${yAxis} by ${xAxis} (${queryTitle})`,
    xAxis,
    yAxis,
    description: `Generated from in-memory SQL Studio (${result.rows.length} rows)`,
    data: result.rows.map((r) => ({
      name: String(r[xAxis] ?? ''),
      value: Number(r[yAxis] ?? 0),
    })),
  };
}

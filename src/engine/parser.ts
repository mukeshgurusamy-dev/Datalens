import Papa from 'papaparse';
import { readSheet } from 'read-excel-file/browser';
import {
  FILE_LIMITS,
  isSafeObjectKey,
  sanitizePlainObject,
} from './security';

function assertFileSize(file: File) {
  if (file.size > FILE_LIMITS.MAX_FILE_BYTES) {
    throw new Error(
      `File exceeds maximum allowed size (${Math.round(FILE_LIMITS.MAX_FILE_BYTES / (1024 * 1024))} MB).`
    );
  }
}

function normalizeParsedRows(rows: Record<string, any>[]): Record<string, any>[] {
  const sanitized = sanitizePlainObject<Record<string, any>[]>(rows);
  for (let i = 0; i < sanitized.length; i++) {
    const row = sanitized[i];
    if (!row || typeof row !== 'object') continue;
    for (const key of Object.keys(row)) {
      const val = row[key];
      if (val instanceof Date) {
        row[key] = isNaN(val.getTime()) ? null : val.toISOString().replace('.000Z', 'Z');
      }
    }
  }
  return sanitized;
}

/**
 * Parses a CSV file using PapaParse with size limits and prototype-pollution sanitization.
 */
export function parseCSV(file: File): Promise<Record<string, any>[]> {
  assertFileSize(file);
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error(results.errors[0].message));
        } else {
          resolve(normalizeParsedRows(results.data as Record<string, any>[]));
        }
      },
      error: (err) => reject(err),
    });
  });
}

/**
 * Parses an Excel (.xlsx) file using read-excel-file (zero-CVE browser parser).
 * Automatically picks the first active sheet and maps header row to sanitized objects.
 */
export async function parseExcel(file: File): Promise<Record<string, any>[]> {
  assertFileSize(file);
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'xls') {
    throw new Error('Legacy binary .xls files are not supported for security reasons. Please save as .xlsx or .csv.');
  }

  const rows = await readSheet(file);
  if (!rows || rows.length < 2) {
    throw new Error('Excel workbook contains no data rows.');
  }

  const rawHeaders = rows[0].map((cell, idx) => {
    const label = cell !== null && cell !== undefined ? String(cell).trim() : '';
    return label || `column_${idx + 1}`;
  });

  const records: Record<string, any>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((cell) => cell === null || cell === undefined || cell === '')) {
      continue;
    }
    const obj: Record<string, any> = {};
    for (let c = 0; c < rawHeaders.length; c++) {
      const header = rawHeaders[c];
      if (!isSafeObjectKey(header)) continue;
      const val = row[c];
      obj[header] = val instanceof Date ? val.toISOString().slice(0, 10) : (val ?? null);
    }
    records.push(obj);
  }

  if (records.length === 0) {
    throw new Error('Excel workbook contains no data rows.');
  }

  return records;
}

/**
 * Parses raw JSON text with size limits and prototype-pollution sanitization.
 */
export function parseJSON(content: string): Record<string, any>[] {
  if (content.length > FILE_LIMITS.MAX_FILE_BYTES) {
    throw new Error(
      `JSON payload exceeds maximum allowed size (${Math.round(FILE_LIMITS.MAX_FILE_BYTES / (1024 * 1024))} MB).`
    );
  }

  const parsed = sanitizePlainObject<any>(JSON.parse(content));
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && typeof parsed === 'object') {
    for (const key of ['data', 'items', 'rows', 'records', 'results']) {
      if (Array.isArray(parsed[key])) {
        return parsed[key];
      }
    }
    return [parsed];
  }
  throw new Error('Invalid JSON format: Expected an array of records.');
}

/**
 * Parses tab-separated spreadsheet clipboard data (from Ctrl+V in Excel/Google Sheets).
 */
export function parseClipboardSpreadsheet(text: string): Record<string, any>[] {
  if (text.length > FILE_LIMITS.MAX_CLIPBOARD_BYTES) {
    throw new Error('Clipboard data exceeds maximum allowed size (10 MB).');
  }

  const trimmed = text.trim();
  if (!trimmed) return [];

  const result = Papa.parse(trimmed, {
    header: true,
    delimiter: '\t',
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (result.data.length > 0) {
    return normalizeParsedRows(result.data as Record<string, any>[]);
  }

  const commaResult = Papa.parse(trimmed, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  return normalizeParsedRows(commaResult.data as Record<string, any>[]);
}

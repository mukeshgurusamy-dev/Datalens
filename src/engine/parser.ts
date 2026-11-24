import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * Parses a CSV file using PapaParse.
 */
export function parseCSV(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error(results.errors[0].message));
        } else {
          resolve(results.data as Record<string, any>[]);
        }
      },
      error: (err) => reject(err),
    });
  });
}

/**
 * Parses an Excel (.xlsx / .xls) file using SheetJS.
 * Automatically picks the first active sheet.
 */
export async function parseExcel(file: File): Promise<Record<string, any>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('Excel workbook contains no sheets.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];
  return jsonData;
}

/**
 * Parses raw JSON text. Automatically extracts nested records if wrapped in an object.
 */
export function parseJSON(content: string): Record<string, any>[] {
  const parsed = JSON.parse(content);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && typeof parsed === 'object') {
    // Look for common array wrappers like { data: [...] } or { items: [...] } or { rows: [...] }
    for (const key of ['data', 'items', 'rows', 'records', 'results']) {
      if (Array.isArray(parsed[key])) {
        return parsed[key];
      }
    }
    // Otherwise wrap single object
    return [parsed];
  }
  throw new Error('Invalid JSON format: Expected an array of records.');
}

/**
 * Parses tab-separated spreadsheet clipboard data (from Ctrl+V in Excel/Google Sheets).
 */
export function parseClipboardSpreadsheet(text: string): Record<string, any>[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Use PapaParse with tab delimiter autodetection
  const result = Papa.parse(trimmed, {
    header: true,
    delimiter: '\t',
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (result.data.length > 0) {
    return result.data as Record<string, any>[];
  }

  // Fallback to comma delimiter if tab wasn't detected
  const commaResult = Papa.parse(trimmed, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  return commaResult.data as Record<string, any>[];
}

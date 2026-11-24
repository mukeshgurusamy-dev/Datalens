import type { ColumnProfile, DataFilterState, DatasetSchema } from '../types/dataset';
import { cleanSlug } from './unslug';
import Papa from 'papaparse';

export interface SharedDashboardPayload {
  v: number; // schema version
  name: string;
  slug: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  sampleRows: Record<string, any>[];
  filters?: DataFilterState;
  customCharts?: Record<string, any>;
  createdAt: number;
}

/**
 * Encodes dashboard state into a compact, URL-safe base64 string.
 */
export function encodeDashboardState(
  dataset: DatasetSchema,
  filters?: DataFilterState,
  customCharts?: Record<string, any>
): string {
  // Retain up to 250 sample records for standalone replay and visualization
  const sampleRows = dataset.rows.slice(0, 250);

  const payload: SharedDashboardPayload = {
    v: 1,
    name: dataset.name,
    slug: dataset.slug || cleanSlug(dataset.name),
    rowCount: dataset.rowCount,
    columnCount: dataset.columnCount,
    columns: dataset.columns,
    sampleRows,
    filters,
    customCharts,
    createdAt: Date.now(),
  };

  const json = JSON.stringify(payload);
  // Safe UTF-8 Base64 encoding
  const utf8Bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  const b64 = btoa(binary);
  // Convert standard base64 to URL-safe base64
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes a URL-safe base64 string into a restored Dashboard state.
 */
export function decodeDashboardState(encoded: string): SharedDashboardPayload | null {
  try {
    if (!encoded || encoded.trim().length === 0) return null;
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) {
      b64 += '=';
    }
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as SharedDashboardPayload;

    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.columns)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Converts a restored payload back into a functional DatasetSchema.
 */
export function reconstructDatasetFromPayload(payload: SharedDashboardPayload): DatasetSchema {
  return {
    id: crypto.randomUUID(),
    name: payload.name,
    slug: payload.slug,
    rowCount: payload.rowCount,
    columnCount: payload.columnCount,
    columns: payload.columns,
    rows: payload.sampleRows,
    parsedAt: payload.createdAt,
  };
}

/**
 * Fetches an external dataset from a raw CSV URL or Google Sheets published CSV URL.
 * Automatically converts Google Sheets edit links into CSV export links.
 */
export async function fetchExternalCsv(rawUrl: string, proxyBaseUrl?: string): Promise<Record<string, any>[]> {
  let targetUrl = rawUrl.trim();

  // Handle Google Sheets sharing link: convert to /export?format=csv, preserving sheet gid if present
  if (targetUrl.includes('docs.google.com/spreadsheets')) {
    const match = targetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = targetUrl.match(/[#?&]gid=([0-9]+)/);
    if (match && match[1]) {
      const sheetId = match[1];
      const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
      targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;
    }
  }

  // Use Cloudflare proxy if provided, otherwise fetch directly
  const fetchUrl = proxyBaseUrl
    ? `${proxyBaseUrl}/api/proxy?url=${encodeURIComponent(targetUrl)}`
    : targetUrl;

  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch external dataset (HTTP ${response.status})`);
  }

  const csvText = await response.text();
  const parsed = Papa.parse(csvText, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error(`CSV Parsing error: ${parsed.errors[0].message}`);
  }

  return parsed.data as Record<string, any>[];
}

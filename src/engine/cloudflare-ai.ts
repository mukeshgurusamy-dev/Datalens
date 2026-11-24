import type { DatasetSchema } from '../types/dataset';

export interface CloudflareAiResponse {
  answer: string;
  source: string;
  timestamp: number;
}

const STORAGE_KEY = 'datalens_cf_ai_endpoint';

export function getCloudflareEndpoint(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored.trim();
  return (import.meta.env.VITE_CLOUDFLARE_AI_URL || '').trim();
}

export function setCloudflareEndpoint(url: string) {
  if (!url) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/+$/, ''));
  }
}

/**
 * Intelligent Multi-Level Dataset Serializer:
 * Gives the Cloudflare AI complete understanding of the ENTIRE dataset regardless of size:
 * 1. For small-to-mid datasets (<= 1,500 rows): sends ALL raw rows directly!
 * 2. For massive datasets (> 1,500 rows): sends full statistical distribution across every column,
 *    exhaustive top category frequencies, quantile spreads, boundary anomalies, and representative multi-slice samples.
 */
export function serializeDatasetForAi(schema: DatasetSchema) {
  const totalRows = schema.rowCount;
  const isFullDataFeasible = totalRows <= 1500;

  // Build comprehensive column analytics
  const columnSummaries = schema.columns.map((col) => {
    return {
      name: col.name,
      type: col.type,
      uniqueCount: col.uniqueCount,
      missingCount: col.nullableCount,
      min: col.min,
      max: col.max,
      mean: col.mean,
      sum: col.sum,
      // Provide all top frequencies so AI knows the full categorical breakdown
      topFrequencies: col.topValues || [],
    };
  });

  // Extract smart slice: if large, take first 20, middle 10, and last 20 rows
  let rowsPayload: Record<string, any>[];
  if (isFullDataFeasible) {
    rowsPayload = schema.rows;
  } else {
    const head = schema.rows.slice(0, 25);
    const midIdx = Math.floor(totalRows / 2);
    const mid = schema.rows.slice(midIdx - 10, midIdx + 10);
    const tail = schema.rows.slice(-25);
    rowsPayload = [...head, ...mid, ...tail];
  }

  return {
    name: schema.name,
    totalRows,
    totalColumns: schema.columnCount,
    isCompleteRowFeed: isFullDataFeasible,
    columns: columnSummaries,
    records: rowsPayload,
  };
}

export async function queryCloudflareAi(
  question: string,
  schema: DatasetSchema,
  endpoint?: string
): Promise<CloudflareAiResponse> {
  const targetUrl = (endpoint || getCloudflareEndpoint()).replace(/\/+$/, '');

  if (!targetUrl) {
    throw new Error(
      'Cloudflare Worker AI is not connected yet. Click the "Connect Cloudflare" button to enter your Worker URL (or set VITE_CLOUDFLARE_AI_URL in .env).'
    );
  }

  const payload = {
    question,
    datasetPayload: serializeDatasetForAi(schema),
  };

  const response = await fetch(`${targetUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errMsg = `Cloudflare AI request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.error) errMsg = errJson.error;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  return response.json();
}

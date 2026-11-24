import { describe, it, expect } from 'vitest';
import {
  encodeDashboardState,
  decodeDashboardState,
  reconstructDatasetFromPayload,
} from '../permalink';
import { profileDataset } from '../profiler';
import { SAMPLES } from '../../data/samples';

describe('Cloudflare Edge Backend & Shareable Permalinks - Quality & Accuracy Audit', () => {
  const saasData = SAMPLES.find((s) => s.id === 'sample-saas')!;
  const masterSchema = profileDataset('SaaS Metrics', saasData.rows);

  it('encodes and decodes dashboard state with 100% roundtrip fidelity', () => {
    const filters = {
      searchQuery: 'enterprise',
      selectedCategories: {
        tier: ['Enterprise'],
      },
    };
    const customCharts = {
      'chart-category-bar': {
        id: 'chart-category-bar',
        type: 'donut',
        xAxis: 'tier',
        yAxis: 'mrr',
      },
    };

    // 1. Encode state into URL-safe hash
    const encoded = encodeDashboardState(masterSchema, filters, customCharts);
    expect(encoded).toBeDefined();
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(50);

    // Verify URL safety: no forbidden base64 characters (+, /, =)
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');

    // 2. Decode state back from URL-safe hash
    const decoded = decodeDashboardState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.name).toBe(masterSchema.name);
    expect(decoded?.rowCount).toBe(15);
    expect(decoded?.columnCount).toBe(6);
    expect(decoded?.columns.length).toBe(6);
    expect(decoded?.sampleRows.length).toBe(15);

    // Verify active filters & customized chart preservation
    expect(decoded?.filters?.searchQuery).toBe('enterprise');
    expect(decoded?.filters?.selectedCategories?.tier).toEqual(['Enterprise']);
    expect(decoded?.customCharts?.['chart-category-bar']?.type).toBe('donut');
  });

  it('reconstructs functional DatasetSchema from decoded payload', () => {
    const encoded = encodeDashboardState(masterSchema);
    const decoded = decodeDashboardState(encoded)!;
    const reconstructed = reconstructDatasetFromPayload(decoded);

    expect(reconstructed.id).toBeDefined();
    expect(reconstructed.name).toBe(masterSchema.name);
    expect(reconstructed.rowCount).toBe(masterSchema.rowCount);
    expect(reconstructed.columns.length).toBe(masterSchema.columns.length);
    expect(reconstructed.rows.length).toBe(masterSchema.rows.length);
  });

  it('resiliently handles corrupted, malformed, or tampered hashes without crashing', () => {
    // 1. Completely invalid string
    expect(decodeDashboardState('invalid-gibberish-string-!@#$%^')).toBeNull();

    // 2. Empty or whitespace string
    expect(decodeDashboardState('')).toBeNull();
    expect(decodeDashboardState('   ')).toBeNull();

    // 3. Valid base64 but invalid JSON structure
    const invalidJsonB64 = btoa('just-a-plain-string').replace(/\+/g, '-').replace(/\//g, '_');
    expect(decodeDashboardState(invalidJsonB64)).toBeNull();

    // 4. Missing required payload version
    const invalidPayloadB64 = btoa(JSON.stringify({ someKey: 123 })).replace(/\+/g, '-').replace(/\//g, '_');
    expect(decodeDashboardState(invalidPayloadB64)).toBeNull();
  });

  it('preserves statistical metrics and column types across serialization', () => {
    const encoded = encodeDashboardState(masterSchema);
    const decoded = decodeDashboardState(encoded)!;

    const colMap = new Map(decoded.columns.map((c) => [c.name, c]));
    expect(colMap.get('mrr')?.type).toBe('number');
    expect(colMap.get('mrr')?.sum).toBe(masterSchema.columns.find((c) => c.name === 'mrr')?.sum);
    expect(colMap.get('tier')?.type).toBe('category');
    expect(colMap.get('date')?.type).toBe('date');
  });
});

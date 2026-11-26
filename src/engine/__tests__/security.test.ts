import { describe, it, expect } from 'vitest';
import {
  neutralizeSpreadsheetFormula,
  sanitizePlainObject,
  validateExternalDatasetUrl,
  FILE_LIMITS,
} from '../security';
import { parseJSON } from '../parser';
import { decodeDashboardState } from '../permalink';
import { executeSqlQuery } from '../sql-engine';

describe('Web Security Hardening Suite', () => {
  it('blocks Prototype Pollution keys (__proto__, constructor, prototype) in JSON and objects', () => {
    const maliciousJson = '[{"name":"Alice","__proto__":{"polluted":true},"constructor":{"bad":1}}]';
    const rows = parseJSON(maliciousJson);

    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe('Alice');
    expect(Object.prototype.hasOwnProperty.call(rows[0], '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(rows[0], 'constructor')).toBe(false);
    expect(({} as any).polluted).toBeUndefined();

    const sanitized = sanitizePlainObject({ a: 1, prototype: { x: 2 } });
    expect(Object.prototype.hasOwnProperty.call(sanitized, 'prototype')).toBe(false);
  });

  it('rejects oversized permalink payloads in decodeDashboardState', () => {
    const hugePayload = 'A'.repeat(FILE_LIMITS.MAX_SHARE_PAYLOAD_BYTES + 10);
    expect(decodeDashboardState(hugePayload)).toBeNull();
  });

  it('neutralizes CSV/Excel formula injection (CWE-1236) while preserving negative numbers', () => {
    expect(neutralizeSpreadsheetFormula("=cmd|'/C calc'!A0")).toBe("'=cmd|'/C calc'!A0");
    expect(neutralizeSpreadsheetFormula('+1+1')).toBe("'+1+1");
    expect(neutralizeSpreadsheetFormula('@SUM(1+1)')).toBe("'@SUM(1+1)");
    expect(neutralizeSpreadsheetFormula('-cmd')).toBe("'-cmd");
    expect(neutralizeSpreadsheetFormula('\t=1+1')).toBe("'\t=1+1");

    // Legitimate negative numbers must remain untouched
    expect(neutralizeSpreadsheetFormula('-125.50')).toBe('-125.50');
    expect(neutralizeSpreadsheetFormula('-42')).toBe('-42');
    expect(neutralizeSpreadsheetFormula('Normal Text')).toBe('Normal Text');
  });

  it('enforces HTTPS-only and blocks private/loopback URLs in validateExternalDatasetUrl', () => {
    expect(() => validateExternalDatasetUrl('javascript:alert(1)')).toThrow();
    expect(() => validateExternalDatasetUrl('file:///etc/passwd')).toThrow();
    expect(() => validateExternalDatasetUrl('http://example.com/data.csv')).toThrow();
    expect(() => validateExternalDatasetUrl('https://localhost/data.csv')).toThrow();
    expect(() => validateExternalDatasetUrl('https://127.0.0.1/data.csv')).toThrow();
    expect(() => validateExternalDatasetUrl('https://169.254.169.254/latest/meta-data')).toThrow();
    expect(() => validateExternalDatasetUrl('https://192.168.1.1/secret.csv')).toThrow();
    expect(() => validateExternalDatasetUrl('https://user:pass@example.com/data.csv')).toThrow();

    const valid = validateExternalDatasetUrl('https://docs.google.com/spreadsheets/d/abc123');
    expect(valid.protocol).toBe('https:');
  });

  it('handles pathological SQL LIKE wildcard patterns safely without ReDoS', () => {
    const rows = [
      { merchant: 'Amazon Web Services', amount: 100 },
      { merchant: 'Apple Store', amount: 200 },
    ];
    const res = executeSqlQuery(
      "SELECT * WHERE merchant LIKE '%%%%%Amazon%%%%%'",
      rows
    );
    expect(res.error).toBeUndefined();
    expect(res.rowCount).toBe(1);
    expect(res.rows[0].merchant).toBe('Amazon Web Services');
  });
});

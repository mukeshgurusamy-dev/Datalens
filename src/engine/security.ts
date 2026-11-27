/**
 * security.ts
 *
 * Client-side security primitives defending against:
 * - CWE-1321: Prototype Pollution (__proto__, constructor, prototype)
 * - CWE-1236: CSV / Spreadsheet Formula Injection (=, +, -, @, \t, \r)
 * - CWE-918: Untrusted URL / Private Network SSRF & Resource Exhaustion DoS
 */

export const FILE_LIMITS = {
  MAX_FILE_BYTES: 50 * 1024 * 1024, // 50 MB
  MAX_CLIPBOARD_BYTES: 10 * 1024 * 1024, // 10 MB
  MAX_SHARE_PAYLOAD_BYTES: 512 * 1024, // 512 KB
  MAX_EXTERNAL_CSV_BYTES: 25 * 1024 * 1024, // 25 MB
  FETCH_TIMEOUT_MS: 15_000, // 15s
} as const;

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Checks if an object key is safe (not part of the prototype chain attack vector).
 */
export function isSafeObjectKey(key: string): boolean {
  return !DANGEROUS_KEYS.has(key);
}

/**
 * Recursively strips dangerous prototype-pollution keys (__proto__, constructor, prototype)
 * from parsed JSON or tabular objects.
 */
export function sanitizePlainObject<T = Record<string, unknown>>(
  input: unknown,
  depth = 0
): T {
  if (depth > 12 || input === null || typeof input !== 'object') {
    return input as T;
  }

  if (input instanceof Date) {
    return (isNaN(input.getTime()) ? null : new Date(input.getTime())) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizePlainObject(item, depth + 1)) as unknown as T;
  }

  const out: Record<string, unknown> = {};
  for (const key of Object.keys(input as Record<string, unknown>)) {
    if (!isSafeObjectKey(key)) continue;
    out[key] = sanitizePlainObject((input as Record<string, unknown>)[key], depth + 1);
  }
  return out as T;
}

/**
 * Neutralizes spreadsheet formula injection (CWE-1236) in exported cells.
 * Strings starting with =, +, -, @, \t, or \r are prefixed with a single quote (')
 * unless they are valid numeric values (e.g., "-42.50").
 */
export function neutralizeSpreadsheetFormula(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    // Allow genuine negative numbers like "-125.50" without quoting
    if (/^-\d+(\.\d+)?$/.test(str.trim())) {
      return str;
    }
    return `'${str}`;
  }
  return str;
}

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

/**
 * Validates that an external dataset URL uses HTTPS and does not target
 * loopback, link-local, or private network hosts.
 */
export function validateExternalDatasetUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error('Invalid URL format. Please provide a valid https:// URL.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Security policy: Only HTTPS URLs are allowed for remote dataset loading.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('Security policy: URLs containing embedded credentials are not allowed.');
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    PRIVATE_IP_PATTERNS.some((re) => re.test(host))
  ) {
    throw new Error('Security policy: Local and private network URLs are blocked.');
  }

  return parsed;
}

/**
 * Fetches text content with an AbortController timeout and byte-size cap.
 */
export async function fetchTextWithLimits(
  url: string,
  timeoutMs: number = FILE_LIMITS.FETCH_TIMEOUT_MS,
  maxBytes: number = FILE_LIMITS.MAX_EXTERNAL_CSV_BYTES
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch external data (HTTP ${response.status}).`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && Number(contentLength) > maxBytes) {
      throw new Error(`Remote file exceeds maximum allowed size (${Math.round(maxBytes / (1024 * 1024))} MB).`);
    }

    const text = await response.text();
    if (text.length > maxBytes) {
      throw new Error(`Remote file exceeds maximum allowed size (${Math.round(maxBytes / (1024 * 1024))} MB).`);
    }

    return text;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

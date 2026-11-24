const ACRONYMS: Record<string, string> = {
  saas: 'SaaS',
  kpi: 'KPI',
  kpis: 'KPIs',
  arr: 'ARR',
  mrr: 'MRR',
  id: 'ID',
  ids: 'IDs',
  api: 'API',
  apis: 'APIs',
  ai: 'AI',
  b2b: 'B2B',
  b2c: 'B2C',
  roi: 'ROI',
  q1: 'Q1',
  q2: 'Q2',
  q3: 'Q3',
  q4: 'Q4',
  fy: 'FY',
  yoy: 'YoY',
  mom: 'MoM',
  csv: 'CSV',
  json: 'JSON',
  sql: 'SQL',
};

/**
 * Transforms messy raw filenames or titles into a clean, semantic URL slug.
 * Removes extensions, machine version artifacts (_final, _v2, timestamps),
 * and normalizes to clean kebab-case.
 */
export function cleanSlug(input: string): string {
  if (!input) return 'dataset';

  // 1. Remove file extensions (.csv, .xlsx, .json, .tsv, etc.)
  let cleaned = input.replace(/\.[a-zA-Z0-9]+$/i, '');

  // 2. Remove common machine suffixes: _final, -v2, (1), timestamps, etc.
  cleaned = cleaned
    .replace(/[_\-\s]*(final|v\d+|copy|\(\d+\))[_\-\s]*/gi, ' ')
    .replace(/\b\d{10,13}\b/g, '') // remove epoch timestamps
    .trim();

  // 3. Convert camelCase to space separated (e.g. "salesData" -> "sales Data")
  cleaned = cleaned.replace(/([a-z])([A-Z])/g, '$1 $2');

  // 4. Convert all non-alphanumeric chars to single dashes
  cleaned = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || 'dataset';
}

/**
 * Reverse of slug: converts a clean slug into a boardroom-ready presentation title.
 * Automatically respects common acronyms (SaaS, KPI, ARR, Q3, etc.).
 */
export function unslugify(slug: string): string {
  if (!slug) return 'Untitled Dataset';

  const parts = slug.replace(/[-_]+/g, ' ').trim().split(/\s+/);

  const formatted = parts.map((word) => {
    const lower = word.toLowerCase();
    if (ACRONYMS[lower]) {
      return ACRONYMS[lower];
    }
    // Capitalize first letter
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  return formatted.join(' ');
}

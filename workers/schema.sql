-- Cloudflare D1 SQLite Schema for DataLens Dashboards & Permalinks
CREATE TABLE IF NOT EXISTS dashboards (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  column_count INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dashboards_slug ON dashboards (slug);

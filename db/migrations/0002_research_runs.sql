CREATE TABLE IF NOT EXISTS research_runs (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES research_companies(id) ON DELETE CASCADE,
  as_of_date TEXT NOT NULL,
  research_version TEXT NOT NULL,
  status TEXT NOT NULL,
  package_hash TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  seed_hash TEXT NOT NULL,
  report_hash TEXT,
  row_counts_json TEXT NOT NULL,
  imported_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS research_runs_company_package_uq
  ON research_runs(company_id, package_hash);
CREATE INDEX IF NOT EXISTS research_runs_company_version_idx
  ON research_runs(company_id, research_version, imported_at DESC);

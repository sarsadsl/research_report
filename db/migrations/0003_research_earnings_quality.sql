-- EQ-01: per-report earnings-quality audit payload. Existing reports remain nullable/unchanged.
CREATE TABLE IF NOT EXISTS research_earnings_quality (
  id TEXT PRIMARY KEY NOT NULL,
  report_id TEXT NOT NULL REFERENCES research_reports(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES research_companies(id) ON DELETE CASCADE,
  as_of_date TEXT NOT NULL,
  review_status TEXT NOT NULL CHECK (review_status IN ('PASS', 'WARN', 'FAIL', 'NOT_RUN')),
  l2_status TEXT NOT NULL CHECK (l2_status IN ('PASS', 'FAIL', 'NOT_RUN')),
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS research_earnings_quality_report_uq ON research_earnings_quality(report_id);
CREATE INDEX IF NOT EXISTS research_earnings_quality_company_idx ON research_earnings_quality(company_id);

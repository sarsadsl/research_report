PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS research_companies (
  id TEXT PRIMARY KEY NOT NULL,
  ticker TEXT NOT NULL,
  market TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sector TEXT,
  industry TEXT,
  currency TEXT NOT NULL DEFAULT 'TWD',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS research_companies_slug_uq ON research_companies(slug);
CREATE UNIQUE INDEX IF NOT EXISTS research_companies_market_ticker_uq ON research_companies(market, ticker);

CREATE TABLE IF NOT EXISTS research_financial_actuals (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES research_companies(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  quarter INTEGER,
  revenue REAL,
  gross_profit REAL,
  gross_margin REAL,
  operating_income REAL,
  operating_margin REAL,
  net_income REAL,
  net_margin REAL,
  eps REAL,
  source_note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS research_financial_actuals_company_period_idx ON research_financial_actuals(company_id, period);

CREATE TABLE IF NOT EXISTS research_monthly_revenue (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES research_companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  revenue REAL NOT NULL,
  mom REAL,
  yoy REAL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS research_monthly_revenue_company_month_uq ON research_monthly_revenue(company_id, year, month);

CREATE TABLE IF NOT EXISTS research_segments (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES research_companies(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  segment TEXT NOT NULL,
  revenue REAL,
  share REAL,
  is_estimate INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS research_segments_company_period_idx ON research_segments(company_id, period);

CREATE TABLE IF NOT EXISTS research_forecasts (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES research_companies(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  scenario TEXT NOT NULL,
  revenue REAL,
  gross_margin REAL,
  net_income REAL,
  eps REAL,
  opto_share REAL,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS research_forecasts_company_year_scenario_uq ON research_forecasts(company_id, fiscal_year, scenario);

CREATE TABLE IF NOT EXISTS research_capacity_events (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES research_companies(id) ON DELETE CASCADE,
  event_date TEXT,
  label TEXT NOT NULL,
  equipment TEXT NOT NULL,
  technology TEXT,
  delta_units INTEGER,
  base_units INTEGER,
  expected_online_date TEXT,
  actual_online_date TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS research_catalysts (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES research_companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  impact TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'watch',
  notes TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_risks (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES research_companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  impact TEXT NOT NULL DEFAULT 'medium',
  probability TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'watch',
  notes TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_signal_rules (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES research_companies(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  green_condition TEXT NOT NULL,
  yellow_condition TEXT NOT NULL,
  red_condition TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1,
  notes TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS research_signal_rules_company_metric_uq ON research_signal_rules(company_id, metric);

CREATE TABLE IF NOT EXISTS research_signal_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES research_companies(id) ON DELETE CASCADE,
  as_of_date TEXT NOT NULL,
  metric TEXT NOT NULL,
  status TEXT NOT NULL,
  value_text TEXT,
  source_type TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS research_signal_snapshots_company_date_idx ON research_signal_snapshots(company_id, as_of_date);

CREATE TABLE IF NOT EXISTS research_sources (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES research_companies(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_group TEXT,
  source_title TEXT NOT NULL,
  published_date TEXT,
  url TEXT,
  file_name TEXT,
  notes TEXT,
  confidence TEXT NOT NULL DEFAULT 'medium'
);

CREATE TABLE IF NOT EXISTS research_reports (
  id TEXT PRIMARY KEY NOT NULL,
  company_id TEXT NOT NULL REFERENCES research_companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT,
  thesis TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  version TEXT NOT NULL,
  html_path TEXT,
  pdf_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS research_reports_slug_version_uq ON research_reports(slug, version);

CREATE TABLE IF NOT EXISTS research_report_sections (
  id TEXT PRIMARY KEY NOT NULL,
  report_id TEXT NOT NULL REFERENCES research_reports(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  content_json TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS research_report_sections_report_key_uq ON research_report_sections(report_id, section_key);

import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const researchCompanies = sqliteTable("research_companies", {
  id: text("id").primaryKey(),
  ticker: text("ticker").notNull(),
  market: text("market").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  sector: text("sector"),
  industry: text("industry"),
  currency: text("currency").notNull().default("TWD"),
  description: text("description"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => [
  uniqueIndex("research_companies_slug_uq").on(t.slug),
  uniqueIndex("research_companies_market_ticker_uq").on(t.market, t.ticker),
]);

export const researchFinancialActuals = sqliteTable("research_financial_actuals", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => researchCompanies.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  fiscalYear: integer("fiscal_year").notNull(),
  quarter: integer("quarter"),
  revenue: real("revenue"),
  grossProfit: real("gross_profit"),
  grossMargin: real("gross_margin"),
  operatingIncome: real("operating_income"),
  operatingMargin: real("operating_margin"),
  netIncome: real("net_income"),
  netMargin: real("net_margin"),
  eps: real("eps"),
  sourceNote: text("source_note"),
  createdAt: text("created_at").notNull(),
}, (t) => [index("research_financial_actuals_company_period_idx").on(t.companyId, t.period)]);

export const researchMonthlyRevenue = sqliteTable("research_monthly_revenue", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => researchCompanies.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  revenue: real("revenue").notNull(),
  mom: real("mom"),
  yoy: real("yoy"),
  createdAt: text("created_at").notNull(),
}, (t) => [uniqueIndex("research_monthly_revenue_company_month_uq").on(t.companyId, t.year, t.month)]);

export const researchSegments = sqliteTable("research_segments", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => researchCompanies.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  segment: text("segment").notNull(),
  revenue: real("revenue"),
  share: real("share"),
  isEstimate: integer("is_estimate", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
}, (t) => [index("research_segments_company_period_idx").on(t.companyId, t.period)]);

export const researchForecasts = sqliteTable("research_forecasts", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => researchCompanies.id, { onDelete: "cascade" }),
  fiscalYear: integer("fiscal_year").notNull(),
  scenario: text("scenario").notNull(),
  revenue: real("revenue"),
  grossMargin: real("gross_margin"),
  netIncome: real("net_income"),
  eps: real("eps"),
  optoShare: real("opto_share"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
}, (t) => [uniqueIndex("research_forecasts_company_year_scenario_uq").on(t.companyId, t.fiscalYear, t.scenario)]);

export const researchCapacityEvents = sqliteTable("research_capacity_events", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => researchCompanies.id, { onDelete: "cascade" }),
  eventDate: text("event_date"),
  label: text("label").notNull(),
  equipment: text("equipment").notNull(),
  technology: text("technology"),
  deltaUnits: integer("delta_units"),
  baseUnits: integer("base_units"),
  expectedOnlineDate: text("expected_online_date"),
  actualOnlineDate: text("actual_online_date"),
  status: text("status").notNull().default("planned"),
  notes: text("notes"),
});

export const researchCatalysts = sqliteTable("research_catalysts", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => researchCompanies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  impact: text("impact").notNull().default("medium"),
  status: text("status").notNull().default("watch"),
  notes: text("notes"),
  updatedAt: text("updated_at").notNull(),
});

export const researchRisks = sqliteTable("research_risks", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => researchCompanies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  impact: text("impact").notNull().default("medium"),
  probability: text("probability").notNull().default("medium"),
  status: text("status").notNull().default("watch"),
  notes: text("notes"),
  updatedAt: text("updated_at").notNull(),
});

export const researchSignalRules = sqliteTable("research_signal_rules", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => researchCompanies.id, { onDelete: "cascade" }),
  metric: text("metric").notNull(),
  greenCondition: text("green_condition").notNull(),
  yellowCondition: text("yellow_condition").notNull(),
  redCondition: text("red_condition").notNull(),
  weight: real("weight").notNull().default(1),
  notes: text("notes"),
}, (t) => [uniqueIndex("research_signal_rules_company_metric_uq").on(t.companyId, t.metric)]);

export const researchSignalSnapshots = sqliteTable("research_signal_snapshots", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => researchCompanies.id, { onDelete: "cascade" }),
  asOfDate: text("as_of_date").notNull(),
  metric: text("metric").notNull(),
  status: text("status").notNull(),
  valueText: text("value_text"),
  sourceType: text("source_type"),
  notes: text("notes"),
}, (t) => [index("research_signal_snapshots_company_date_idx").on(t.companyId, t.asOfDate)]);

export const researchSources = sqliteTable("research_sources", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => researchCompanies.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(),
  sourceGroup: text("source_group"),
  sourceTitle: text("source_title").notNull(),
  publishedDate: text("published_date"),
  url: text("url"),
  fileName: text("file_name"),
  notes: text("notes"),
  confidence: text("confidence").notNull().default("medium"),
});

export const researchReports = sqliteTable("research_reports", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => researchCompanies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  summary: text("summary"),
  thesis: text("thesis"),
  status: text("status").notNull().default("draft"),
  version: text("version").notNull(),
  htmlPath: text("html_path"),
  pdfPath: text("pdf_path"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  publishedAt: text("published_at"),
}, (t) => [uniqueIndex("research_reports_slug_version_uq").on(t.slug, t.version)]);

export const researchReportSections = sqliteTable("research_report_sections", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => researchReports.id, { onDelete: "cascade" }),
  sectionKey: text("section_key").notNull(),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").notNull(),
  contentJson: text("content_json"),
}, (t) => [uniqueIndex("research_report_sections_report_key_uq").on(t.reportId, t.sectionKey)]);

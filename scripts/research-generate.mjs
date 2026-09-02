import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSafeSlug, assertValid, sha256, validateSlug } from "./research-lib.mjs";

const slug = process.argv[2];
if (!slug) throw new Error("Usage: npm run research:generate -- <slug> [--check]");
assertSafeSlug(slug);
const checkOnly = process.argv.includes("--check");
const root = process.cwd();
const { researchPackage: pkg, result } = await validateSlug(slug, root);
assertValid(result);

function fallbackDetail(pkg) {
  const provenanceKeys = new Set(["evidenceClass", "sourceIds", "claimIds", "currency", "scale"]);
  const strip = (row) => Object.fromEntries(Object.entries(row).filter(([key]) => !provenanceKeys.has(key)));
  return {
    company: pkg.company,
    dashboard: pkg.dashboard,
    actuals: pkg.actuals.map((row) => ({ ...strip(row), companyId: pkg.company.id })),
    monthlyRevenue: pkg.monthlyRevenue.map((row) => {
      const { year, month, revenue, mom = null, yoy = null } = row;
      return { year, month, revenue, mom, yoy };
    }),
    segments: pkg.segments.map((row) => {
      const { period, segment, revenue = null, share = null, isEstimate } = row;
      return { period, segment, revenue, share, isEstimate };
    }),
    forecasts: pkg.forecasts.map((row) => {
      const { fiscalYear, scenario, revenue = null, grossMargin = null, netIncome = null, eps = null, optoShare = null, notes = null } = row;
      return { fiscalYear, scenario, revenue, grossMargin, netIncome, eps, optoShare, notes };
    }),
    signals: pkg.signalSnapshots.map((row) => {
      const { asOfDate, metric, status, valueText = null, notes = null } = row;
      return { asOfDate, metric, status, valueText, notes };
    }),
    capacity: pkg.capacity.map((row) => {
      const { label, equipment, technology = null, deltaUnits = null, baseUnits = null, expectedOnlineDate = null, status, notes = null } = row;
      return { label, equipment, technology, deltaUnits, baseUnits, expectedOnlineDate, status, notes };
    }),
    catalysts: pkg.catalysts.map((row) => {
      const { title, impact, status, notes = null } = row;
      return { title, impact, status, notes };
    }),
    risks: pkg.risks.map((row) => {
      const { title, impact, probability, status, notes = null } = row;
      return { title, impact, probability, status, notes };
    }),
    reports: [{
      id: pkg.report.id,
      title: pkg.report.title,
      slug: pkg.report.slug,
      summary: pkg.report.summary ?? null,
      thesis: pkg.report.thesis ?? null,
      status: pkg.report.status,
      version: pkg.report.version,
      htmlPath: `/research/reports/${pkg.company.slug}.html`,
      pdfPath: null,
      publishedAt: pkg.report.publishedAt ?? null,
    }],
  };
}

function sqlValue(value) {
  if (value === undefined || value === null) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Cannot serialize non-finite SQL number: ${value}`);
    return String(value);
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function insert(table, columns, rows) {
  if (rows.length === 0) return "";
  const values = rows.map((row) => `(${columns.map((column) => sqlValue(row[column])).join(",")})`).join(",\n");
  const updates = columns.filter((column) => column !== "id").map((column) => `${column}=excluded.${column}`).join(",");
  return `INSERT INTO ${table}\n(${columns.join(",")})\nVALUES\n${values}\nON CONFLICT(id) DO UPDATE SET ${updates};\n`;
}

function cleanup(table, companyId, ids, companyColumn = "company_id") {
  if (ids.length === 0) return `DELETE FROM ${table} WHERE ${companyColumn}=${sqlValue(companyId)};\n`;
  return `DELETE FROM ${table} WHERE ${companyColumn}=${sqlValue(companyId)} AND id NOT IN (${ids.map(sqlValue).join(",")});\n`;
}

function d1Seed(pkg) {
  const c = pkg.company;
  const asOf = pkg.asOfDate;
  const company = [{ ...c, status: pkg.report.visibility === "unlisted" ? "unlisted" : "active", created_at: asOf, updated_at: asOf }];
  const actuals = pkg.actuals.map((row) => ({
    ...row, company_id: c.id, fiscal_year: row.fiscalYear, gross_profit: row.grossProfit,
    gross_margin: row.grossMargin, operating_income: row.operatingIncome, operating_margin: row.operatingMargin,
    net_income: row.netIncome, net_margin: row.netMargin,
    source_note: `${row.evidenceClass}; sources=${row.sourceIds.join(",")}`, created_at: asOf,
  }));
  const monthly = pkg.monthlyRevenue.map((row) => ({ ...row, company_id: c.id, created_at: asOf }));
  const segments = pkg.segments.map((row) => ({ ...row, company_id: c.id, is_estimate: row.isEstimate, created_at: asOf }));
  const forecasts = pkg.forecasts.map((row) => ({
    ...row, company_id: c.id, fiscal_year: row.fiscalYear, gross_margin: row.grossMargin,
    net_income: row.netIncome, opto_share: row.optoShare, created_at: asOf,
  }));
  const capacity = pkg.capacity.map((row) => ({
    ...row, company_id: c.id, event_date: row.eventDate, delta_units: row.deltaUnits,
    base_units: row.baseUnits, expected_online_date: row.expectedOnlineDate,
    actual_online_date: row.actualOnlineDate,
  }));
  const catalysts = pkg.catalysts.map((row) => ({ ...row, company_id: c.id, updated_at: asOf }));
  const risks = pkg.risks.map((row) => ({ ...row, company_id: c.id, updated_at: asOf }));
  const rules = pkg.signalRules.map((row) => ({
    ...row, company_id: c.id, green_condition: row.greenCondition,
    yellow_condition: row.yellowCondition, red_condition: row.redCondition,
    notes: `${row.evidenceClass}; sources=${row.sourceIds.join(",")}`,
  }));
  const snapshots = pkg.signalSnapshots.map((row) => ({
    ...row, company_id: c.id, as_of_date: row.asOfDate, value_text: row.valueText,
    source_type: row.evidenceClass,
  }));
  const sources = pkg.sources.map((row) => ({
    ...row, company_id: c.id, source_type: row.evidenceClass, source_group: row.provider,
    source_title: row.title, published_date: row.publishedDate, file_name: row.attachment,
    notes: [row.notes, `accessed=${row.accessedDate}`, `periods=${row.coveredPeriods.join("|")}`].filter(Boolean).join("; "),
  }));
  const reports = [{
    ...pkg.report, company_id: c.id, html_path: `/research/reports/${c.slug}.html`, pdf_path: null,
    created_at: asOf, updated_at: asOf, published_at: pkg.report.publishedAt,
  }];
  const sections = pkg.sections.map((row) => ({
    id: row.id, report_id: pkg.report.id, section_key: row.id, title: row.title,
    sort_order: row.sortOrder, content_json: JSON.stringify({ type: row.type, payloadRefs: row.payloadRefs, showSources: row.showSources }),
  }));
  sections.push({
    id: `${pkg.report.id}-dashboard`, report_id: pkg.report.id, section_key: "dashboard-config",
    title: "Dashboard Config", sort_order: 0, content_json: JSON.stringify(pkg.dashboard),
  });

  const blocks = [
    "PRAGMA foreign_keys = ON;\n",
    insert("research_companies", ["id","ticker","market","name","slug","sector","industry","currency","description","status","created_at","updated_at"], company),
    insert("research_financial_actuals", ["id","company_id","period","fiscal_year","quarter","revenue","gross_profit","gross_margin","operating_income","operating_margin","net_income","net_margin","eps","source_note","created_at"], actuals),
    insert("research_monthly_revenue", ["id","company_id","year","month","revenue","mom","yoy","created_at"], monthly),
    insert("research_segments", ["id","company_id","period","segment","revenue","share","is_estimate","created_at"], segments),
    insert("research_forecasts", ["id","company_id","fiscal_year","scenario","revenue","gross_margin","net_income","eps","opto_share","notes","created_at"], forecasts),
    insert("research_capacity_events", ["id","company_id","event_date","label","equipment","technology","delta_units","base_units","expected_online_date","actual_online_date","status","notes"], capacity),
    insert("research_catalysts", ["id","company_id","title","impact","status","notes","updated_at"], catalysts),
    insert("research_risks", ["id","company_id","title","impact","probability","status","notes","updated_at"], risks),
    insert("research_signal_rules", ["id","company_id","metric","green_condition","yellow_condition","red_condition","weight","notes"], rules),
    insert("research_signal_snapshots", ["id","company_id","as_of_date","metric","status","value_text","source_type","notes"], snapshots),
    insert("research_sources", ["id","company_id","source_type","source_group","source_title","published_date","url","file_name","notes","confidence"], sources),
    insert("research_reports", ["id","company_id","title","slug","summary","thesis","status","version","html_path","pdf_path","created_at","updated_at","published_at"], reports),
    insert("research_report_sections", ["id","report_id","section_key","title","sort_order","content_json"], sections),
    "\n-- Remove stale rows only after all canonical rows have been upserted.\n",
    cleanup("research_financial_actuals", c.id, actuals.map((row) => row.id)),
    cleanup("research_monthly_revenue", c.id, monthly.map((row) => row.id)),
    cleanup("research_segments", c.id, segments.map((row) => row.id)),
    cleanup("research_forecasts", c.id, forecasts.map((row) => row.id)),
    cleanup("research_capacity_events", c.id, capacity.map((row) => row.id)),
    cleanup("research_catalysts", c.id, catalysts.map((row) => row.id)),
    cleanup("research_risks", c.id, risks.map((row) => row.id)),
    cleanup("research_signal_rules", c.id, rules.map((row) => row.id)),
    cleanup("research_signal_snapshots", c.id, snapshots.map((row) => row.id)),
    cleanup("research_sources", c.id, sources.map((row) => row.id)),
    cleanup("research_reports", c.id, reports.map((row) => row.id)),
    `DELETE FROM research_report_sections WHERE report_id=${sqlValue(pkg.report.id)} AND id NOT IN (${sections.map((row) => sqlValue(row.id)).join(",")});\n`,
  ];
  return blocks.filter(Boolean).join("\n");
}

const fallback = JSON.stringify(fallbackDetail(pkg), null, 2) + "\n";
const sql = d1Seed(pkg);
const targets = [
  { file: path.join(root, "lib", "research", "generated", `${slug}.json`), content: fallback },
  { file: path.join(root, "db", "seed", `${pkg.company.ticker}.sql`), content: sql },
];

for (const target of targets) {
  if (checkOnly) {
    const current = await readFile(target.file, "utf8").catch(() => null);
    if (current !== target.content) throw new Error(`Generated file is stale: ${path.relative(root, target.file)}. Run npm run research:generate -- ${slug}`);
  } else {
    await mkdir(path.dirname(target.file), { recursive: true });
    await writeFile(target.file, target.content);
  }
}

console.log(JSON.stringify({
  research: `${pkg.company.name} ${pkg.company.ticker}`,
  slug,
  mode: checkOnly ? "check" : "write",
  packageHash: result.packageHash,
  fallbackHash: sha256(fallback),
  sqlHash: sha256(sql),
  targets: targets.map((target) => path.relative(root, target.file)),
}, null, 2));

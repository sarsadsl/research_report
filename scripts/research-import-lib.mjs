import { sha256 } from "./research-lib.mjs";

export const IMPORT_COLLECTIONS = {
  research_financial_actuals: "actuals",
  research_monthly_revenue: "monthlyRevenue",
  research_segments: "segments",
  research_forecasts: "forecasts",
  research_capacity_events: "capacity",
  research_catalysts: "catalysts",
  research_risks: "risks",
  research_signal_rules: "signalRules",
  research_signal_snapshots: "signalSnapshots",
  research_sources: "sources",
  research_reports: "report",
  research_report_sections: "sections",
};

export function parseImportArgs(argv) {
  const slug = argv.find((value) => !value.startsWith("--"));
  if (!slug) throw new Error("Usage: npm run research:import -- <slug> [--local|--remote] [--dry-run] [--skip-migrations]");
  const known = new Set(["--local", "--remote", "--dry-run", "--skip-migrations"]);
  const unknown = argv.filter((value) => value.startsWith("--") && !known.has(value));
  if (unknown.length) throw new Error(`Unknown importer option: ${unknown.join(", ")}`);
  if (argv.includes("--local") && argv.includes("--remote")) throw new Error("Choose only one of --local or --remote");
  return {
    slug,
    target: argv.includes("--remote") ? "remote" : "local",
    dryRun: argv.includes("--dry-run"),
    applyMigrations: !argv.includes("--skip-migrations"),
  };
}

export function expectedRowCounts(pkg) {
  return Object.fromEntries(Object.entries(IMPORT_COLLECTIONS).map(([table, key]) => {
    if (key === "report") return [table, 1];
    if (key === "sections") return [table, pkg.sections.length + 1];
    return [table, pkg[key].length];
  }));
}

export function buildRunMetadata(pkg, { packageHash, seedHash, reportHash = null, importedAt }) {
  const sourceHash = sha256(pkg.sources);
  return {
    id: `${pkg.company.id}-v${pkg.report.version.replaceAll(/[^a-zA-Z0-9]+/g, "-")}-${packageHash.slice(0, 12)}`,
    companyId: pkg.company.id,
    asOfDate: pkg.asOfDate,
    researchVersion: pkg.report.version,
    status: "imported",
    packageHash,
    sourceHash,
    seedHash,
    reportHash,
    rowCounts: expectedRowCounts(pkg),
    importedAt,
  };
}

export function sqlValue(value) {
  if (value === undefined || value === null) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function runRecordSql(run) {
  const values = [
    run.id, run.companyId, run.asOfDate, run.researchVersion, run.status,
    run.packageHash, run.sourceHash, run.seedHash, run.reportHash,
    JSON.stringify(run.rowCounts), run.importedAt,
  ].map(sqlValue).join(",");
  return `INSERT INTO research_runs\n(id,company_id,as_of_date,research_version,status,package_hash,source_hash,seed_hash,report_hash,row_counts_json,imported_at)\nVALUES\n(${values})\nON CONFLICT(id) DO UPDATE SET\nstatus=excluded.status,seed_hash=excluded.seed_hash,report_hash=excluded.report_hash,row_counts_json=excluded.row_counts_json,imported_at=excluded.imported_at;\n`;
}

export function verificationSql(run) {
  const company = sqlValue(run.companyId);
  const reportId = `(SELECT id FROM research_reports WHERE company_id=${company} AND version=${sqlValue(run.researchVersion)} LIMIT 1)`;
  const columns = [
    `(SELECT COUNT(*) FROM research_runs WHERE id=${sqlValue(run.id)} AND package_hash=${sqlValue(run.packageHash)} AND status='imported') AS run_count`,
    ...Object.keys(run.rowCounts).map((table) => {
      const where = table === "research_report_sections" ? `report_id=${reportId}` : `company_id=${company}`;
      return `(SELECT COUNT(*) FROM ${table} WHERE ${where}) AS ${table}`;
    }),
  ];
  return `SELECT\n${columns.join(",\n")}\n;`;
}

export function extractWranglerRows(jsonText) {
  const parsed = JSON.parse(jsonText);
  const entries = Array.isArray(parsed) ? parsed : [parsed];
  for (const entry of entries) {
    if (Array.isArray(entry?.results)) return entry.results;
    if (Array.isArray(entry?.result?.[0]?.results)) return entry.result[0].results;
  }
  throw new Error("Wrangler JSON did not contain query results");
}

export function verifyImportRow(row, run) {
  const errors = [];
  if (Number(row?.run_count) !== 1) errors.push(`research_runs: expected 1, got ${row?.run_count ?? "missing"}`);
  for (const [table, expected] of Object.entries(run.rowCounts)) {
    if (Number(row?.[table]) !== expected) errors.push(`${table}: expected ${expected}, got ${row?.[table] ?? "missing"}`);
  }
  return { ok: errors.length === 0, errors };
}

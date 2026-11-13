// Read-only D1 audit helpers. No arbitrary SQL or public fallback.
export const AUDIT_COUNT_TABLES = Object.freeze([
  "research_financial_actuals", "research_monthly_revenue", "research_segments",
  "research_forecasts", "research_capacity_events", "research_catalysts",
  "research_risks", "research_signal_rules", "research_signal_snapshots",
  "research_sources", "research_reports",
]);

export async function verifyAuditBearer(secret, authorization) {
  // A missing/weak secret must never authorize access.
  if (typeof secret !== "string" || secret.length < 32 || secret.length > 512) return false;
  const match = typeof authorization === "string"
    ? /^Bearer ([A-Za-z0-9._~+\/-]{32,512}={0,2})$/.exec(authorization)
    : null;
  if (!match) return false;
  const encoder = new TextEncoder();
  const [expected, received] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(secret)),
    crypto.subtle.digest("SHA-256", encoder.encode(match[1])),
  ]);
  const a = new Uint8Array(expected);
  const b = new Uint8Array(received);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

export function parseExpectedRowCounts(value) {
  if (typeof value !== "string") return null;
  try {
    const result = JSON.parse(value);
    if (!result || Array.isArray(result) || typeof result !== "object") return null;
    const output = {};
    for (const [name, count] of Object.entries(result)) {
      if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) return null;
      output[name] = count;
    }
    return output;
  } catch {
    return null;
  }
}

export function buildAuditSummary({ companies, reports, runs, counts, sections, earnings }, requestedSlug = null) {
  const reportRows = new Map();
  const runRows = new Map();
  const countsByCompany = new Map();
  const sectionRows = new Map(sections.map(x => [x.report_id, Number(x.total)]));
  const earningsRows = new Map(earnings.map(x => [x.report_id, Number(x.total)]));

  for (const report of reports) {
    const list = reportRows.get(report.company_id) ?? [];
    list.push(report);
    reportRows.set(report.company_id, list);
  }
  for (const run of runs) {
    const list = runRows.get(run.company_id) ?? [];
    list.push(run);
    runRows.set(run.company_id, list);
  }
  for (const row of counts) {
    const key = row.company_id;
    const values = countsByCompany.get(key) ?? {};
    values[row.table_name] = Number(row.total);
    countsByCompany.set(key, values);
  }

  return companies.filter(c => !requestedSlug || c.slug === requestedSlug).map(company => {
    const allReports = reportRows.get(company.id) ?? [];
    const publishedReport = allReports.find(r => r.status === "published") ?? null;
    const latestReport = allReports[0] ?? null;
    const latestRun = (runRows.get(company.id) ?? [])[0] ?? null;
    const expected = latestRun ? parseExpectedRowCounts(latestRun.row_counts_json) : null;
    const observed = { ...countsByCompany.get(company.id) };
    for (const table of AUDIT_COUNT_TABLES) observed[table] ??= 0;
    const matchingReport = allReports.find(r => r.version === latestRun?.research_version);
    observed.research_report_sections = matchingReport ? (sectionRows.get(matchingReport.id) ?? 0) : null;
    observed.research_earnings_quality = matchingReport ? (earningsRows.get(matchingReport.id) ?? 0) : null;

    const issues = [];
    if (!publishedReport) issues.push("NO_PUBLISHED_REPORT");
    if (!latestRun) issues.push("NO_IMPORT_RUN");
    if (latestRun && latestRun.status !== "imported") issues.push("RUN_NOT_IMPORTED");
    if (latestRun && !latestRun.report_hash) issues.push("NO_IMPORTED_REPORT_HASH");
    if (latestRun && publishedReport && latestRun.research_version !== publishedReport.version) issues.push("VERSION_MISMATCH");
    if (latestRun && !expected) issues.push("INVALID_EXPECTED_ROW_COUNTS");
    const mismatches = [];
    if (expected) for (const [table, count] of Object.entries(expected)) {
      const actual = observed[table];
      if (actual == null || actual !== count) mismatches.push({ table, expected: count, observed: actual ?? null });
    }
    if (mismatches.length) issues.push("ROW_COUNT_MISMATCH");
    return {
      company: { slug: company.slug, ticker: company.ticker, market: company.market, name: company.name, status: company.status },
      latestReport: latestReport && {
        version: latestReport.version, status: latestReport.status, updatedAt: latestReport.updated_at,
        publishedAt: latestReport.published_at, htmlPath: latestReport.html_path,
      },
      publishedReport: publishedReport && {
        version: publishedReport.version, publishedAt: publishedReport.published_at, htmlPath: publishedReport.html_path,
      },
      latestRun: latestRun && {
        id: latestRun.id, status: latestRun.status, asOfDate: latestRun.as_of_date,
        researchVersion: latestRun.research_version, importedAt: latestRun.imported_at,
        packageHash: latestRun.package_hash, sourceHash: latestRun.source_hash,
        seedHash: latestRun.seed_hash, reportHash: latestRun.report_hash,
      },
      expectedRowCounts: expected,
      observedRowCounts: observed,
      mismatches,
      issues,
      status: issues.length ? "REVIEW_REQUIRED" : "METADATA_MATCH",
    };
  });
}

export const AUDIT_COUNTS_SQL = AUDIT_COUNT_TABLES.map(table =>
  `SELECT '${table}' AS table_name, company_id, COUNT(*) AS total FROM ${table} GROUP BY company_id`
).join(" UNION ALL ");

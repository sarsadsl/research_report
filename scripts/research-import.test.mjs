import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRunMetadata,
  expectedRowCounts,
  extractWranglerRows,
  parseImportArgs,
  runRecordSql,
  verificationSql,
  verifyImportRow,
} from "./research-import-lib.mjs";

const pkg = {
  asOfDate: "2026-08-27",
  company: { id: "vpec-2455" },
  report: { version: "1.1" },
  actuals: [{}], monthlyRevenue: [{}, {}], segments: [], forecasts: [{}], capacity: [],
  catalysts: [], risks: [], signalRules: [], signalSnapshots: [], sources: [{ id: "source-1" }], sections: [{ id: "summary" }],
};

test("import arguments default safely to local and reject conflicting targets", () => {
  assert.deepEqual(parseImportArgs(["vpec-2455", "--dry-run"]), {
    slug: "vpec-2455", target: "local", dryRun: true, applyMigrations: true,
  });
  assert.equal(parseImportArgs(["vpec-2455", "--remote", "--skip-migrations"]).target, "remote");
  assert.throws(() => parseImportArgs(["vpec-2455", "--local", "--remote"]), /Choose only one/);
  assert.throws(() => parseImportArgs(["vpec-2455", "--wat"]), /Unknown importer option/);
});

test("run metadata is deterministic for package identity and records canonical counts", () => {
  const run = buildRunMetadata(pkg, {
    packageHash: "a".repeat(64), seedHash: "b".repeat(64), reportHash: "c".repeat(64), importedAt: "2026-08-29T00:00:00.000Z",
  });
  assert.equal(run.id, "vpec-2455-v1-1-aaaaaaaaaaaa");
  assert.equal(run.rowCounts.research_monthly_revenue, 2);
  assert.equal(run.rowCounts.research_reports, 1);
  assert.equal(run.rowCounts.research_report_sections, 2);
  assert.deepEqual(run.rowCounts, expectedRowCounts(pkg));
});

test("run SQL escapes values and verification checks every imported collection", () => {
  const quoted = structuredClone(pkg);
  quoted.company.id = "company'oops";
  const run = buildRunMetadata(quoted, {
    packageHash: "a".repeat(64), seedHash: "b".repeat(64), importedAt: "2026-08-29T00:00:00.000Z",
  });
  assert.match(runRecordSql(run), /company''oops/);
  assert.match(verificationSql(run), /research_financial_actuals/);
  const row = { run_count: 1, ...run.rowCounts };
  assert.deepEqual(verifyImportRow(row, run), { ok: true, errors: [] });
  row.research_forecasts = 99;
  assert.equal(verifyImportRow(row, run).ok, false);
});

test("Wrangler JSON extraction supports direct execute output", () => {
  assert.deepEqual(extractWranglerRows(JSON.stringify([{ results: [{ run_count: 1 }] }])), [{ run_count: 1 }]);
});

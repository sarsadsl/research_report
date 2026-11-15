import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRunMetadata,
  expectedRowCounts,
  extractWranglerRows,
  parseImportArgs,
  requireRemoteCertificate,
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

test("remote import requires a passing signed certificate before any D1 effect", async () => {
  const remote = parseImportArgs(["vpec-2455", "--remote"]);
  let calls = 0;
  const verify = async () => {
    calls += 1;
    return {
      ok: true,
      certificate: { payload: { status: "PASS_WITH_P2" } },
      summary: { status: "PASS_WITH_P2", payloadHash: "signed" },
    };
  };

  assert.deepEqual(await requireRemoteCertificate(remote, verify), {
    status: "PASS_WITH_P2",
    payloadHash: "signed",
  });
  assert.equal(calls, 1);
  await assert.rejects(
    requireRemoteCertificate(remote, async () => ({ ok: false, certificate: { payload: { status: "BLOCKED" } } })),
    /certificate did not pass/i,
  );
  await assert.rejects(requireRemoteCertificate(remote), /requires a signed/i);

  assert.equal(await requireRemoteCertificate(parseImportArgs(["vpec-2455", "--local"])), null);
  assert.equal(await requireRemoteCertificate(parseImportArgs(["vpec-2455", "--remote", "--dry-run"])), null);
  assert.equal(calls, 1, "local and dry-run paths must not invoke certificate verification");
});

test("run metadata is deterministic for package identity and records canonical counts", () => {
  const run = buildRunMetadata(pkg, {
    packageHash: "a".repeat(64), seedHash: "b".repeat(64), reportHash: "c".repeat(64), importedAt: "2026-08-29T00:00:00.000Z",
  });
  assert.equal(run.id, "vpec-2455-v1-1-aaaaaaaaaaaa");
  assert.equal(run.rowCounts.research_monthly_revenue, 2);
  assert.equal(run.rowCounts.research_reports, 1);
  assert.equal(run.rowCounts.research_report_sections, 2);
  assert.equal(run.rowCounts.research_earnings_quality, 0);
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
  assert.match(verificationSql(run), /research_earnings_quality/);
  const row = { run_count: 1, source_hash: run.sourceHash, seed_hash: run.seedHash, report_hash: run.reportHash, ...run.rowCounts };
  assert.deepEqual(verifyImportRow(row, run), { ok: true, errors: [] });
  row.research_forecasts = 99;
  assert.equal(verifyImportRow(row, run).ok, false);
  row.research_forecasts = run.rowCounts.research_forecasts;
  row.report_hash = "wrong-artifact";
  assert.match(verifyImportRow(row, run).errors.join("\n"), /report_hash: hash mismatch/);
});

test("EQ-01 import expects one report-scoped row if an audit exists", () => {
  const audited={...pkg,earningsQuality:{reviewStatus:"PASS",l2:{status:"PASS"}}};
  assert.equal(expectedRowCounts(audited).research_earnings_quality,1);
  const run=buildRunMetadata(audited,{packageHash:"a".repeat(64),seedHash:"b".repeat(64),importedAt:"2026-11-13T00:00:00Z"});
  assert.match(verificationSql(run),/research_earnings_quality WHERE report_id=/);
  assert.equal(run.earningsQualityHash.length,64);
  const good={run_count:1,source_hash:run.sourceHash,seed_hash:run.seedHash,report_hash:run.reportHash,
    eq01_payload_hash:run.earningsQualityHash,...run.rowCounts};
  assert.equal(verifyImportRow(good,run).ok,true);
  good.eq01_payload_hash="stale-audit";
  assert.match(verifyImportRow(good,run).errors.join("\n"),/payload hash mismatch/);
});

test("Wrangler JSON extraction supports direct execute output", () => {
  assert.deepEqual(extractWranglerRows(JSON.stringify([{ results: [{ run_count: 1 }] }])), [{ run_count: 1 }]);
});

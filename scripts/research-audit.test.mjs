import test from "node:test";
import assert from "node:assert/strict";
import {
  AUDIT_COUNT_TABLES, AUDIT_COUNTS_SQL, verifyAuditBearer,
  parseExpectedRowCounts, buildAuditSummary,
} from "../lib/research/audit-core.mjs";

test("bearer authentication fails closed and accepts only configured secret", async () => {
  const secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  assert.equal(await verifyAuditBearer(undefined, `Bearer ${secret}`), false);
  assert.equal(await verifyAuditBearer("too-short", "Bearer too-short"), false);
  assert.equal(await verifyAuditBearer(secret, undefined), false);
  assert.equal(await verifyAuditBearer(secret, `Bearer ${secret}x`), false);
  assert.equal(await verifyAuditBearer(secret, `Basic ${secret}`), false);
  assert.equal(await verifyAuditBearer(secret, `Bearer ${secret}`), true);
});

test("row count parsing rejects invalid or fabricated values", () => {
  assert.deepEqual(parseExpectedRowCounts('{"research_reports":1,"research_sources":5}'), {
    research_reports: 1, research_sources: 5,
  });
  for (const invalid of ["", "[]", "null", "12", '{"x":-1}', '{"x":1.5}', '{"x":"1"}', "not-json"]) {
    assert.equal(parseExpectedRowCounts(invalid), null);
  }
});

test("audit counts SQL is restricted to known read-only tables", () => {
  assert.equal(AUDIT_COUNT_TABLES.length, 11);
  assert.ok(AUDIT_COUNTS_SQL.startsWith("SELECT "));
  assert.equal((AUDIT_COUNTS_SQL.match(/SELECT /g) ?? []).length, 11);
  assert.doesNotMatch(AUDIT_COUNTS_SQL, /INSERT|UPDATE|DELETE|DROP|ALTER/i);
});

const fixture = () => ({
  companies: [
    { id: "c1", slug: "vpec-2455", ticker: "2455", market: "TW", name: "全新", status: "active" },
    { id: "c2", slug: "nanya-1303", ticker: "1303", market: "TW", name: "南亞", status: "active" },
  ],
  reports: [
    { id: "r1", company_id: "c1", version: "1.0.0", status: "published",
      updated_at: "2026-11-13", published_at: "2026-11-13", html_path: "/research/reports/vpec-2455.html" },
  ],
  runs: [
    { id: "run1", company_id: "c1", research_version: "1.0.0", status: "imported", as_of_date: "2026-11-13",
      package_hash: "package", source_hash: "sources", seed_hash: "seed", report_hash: "report",
      imported_at: "2026-11-13T10:00:00Z",
      row_counts_json: '{"research_reports":1,"research_sources":3,"research_report_sections":5,"research_earnings_quality":0}' },
  ],
  counts: [
    { company_id: "c1", table_name: "research_reports", total: 1 },
    { company_id: "c1", table_name: "research_sources", total: 3 },
  ],
  sections: [{ report_id: "r1", total: 5 }],
  earnings: [],
});

test("audit compares actual D1 table counts and reports missing imports", () => {
  const [a, b] = buildAuditSummary(fixture());
  assert.equal(a.status, "METADATA_MATCH");
  assert.deepEqual(a.issues, []);
  assert.equal(a.latestRun.reportHash, "report");
  assert.equal(a.observedRowCounts.research_report_sections, 5);
  assert.equal(a.observedRowCounts.research_earnings_quality, 0);
  assert.equal(b.status, "REVIEW_REQUIRED");
  assert.ok(b.issues.includes("NO_PUBLISHED_REPORT"));
  assert.ok(b.issues.includes("NO_IMPORT_RUN"));
});

test("audit does not silently accept mismatched version, count or missing report hash", () => {
  const data = fixture();
  data.runs[0].research_version = "0.9.0";
  data.runs[0].report_hash = null;
  data.runs[0].row_counts_json = '{"research_sources":99,"research_report_sections":5}';
  const [record] = buildAuditSummary(data, "vpec-2455");
  assert.equal(record.status, "REVIEW_REQUIRED");
  assert.ok(record.issues.includes("VERSION_MISMATCH"));
  assert.ok(record.issues.includes("NO_IMPORTED_REPORT_HASH"));
  assert.ok(record.issues.includes("ROW_COUNT_MISMATCH"));
  assert.deepEqual(record.mismatches, [
    { table: "research_sources", expected: 99, observed: 3 },
    { table: "research_report_sections", expected: 5, observed: null },
  ]);
  assert.deepEqual(buildAuditSummary(data, "nonexistent-9999"), []);
});

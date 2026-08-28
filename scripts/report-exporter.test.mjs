import assert from "node:assert/strict";
import test from "node:test";
import { standaloneFilename, validateStandaloneHtml } from "./report-exporter.mjs";

const payload = {
  profileName: "full-research",
  company: { slug: "vpec-2455" },
  profile: { expectedPages: 14 },
};

const fixture = (extra = "") => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body>${Array.from({ length: 14 }, () => '<section class="page"></section>').join("")}<script id="research-report-payload" type="application/json">${JSON.stringify(payload)}</script><script>window.__researchLayout={totalPages:14}</script>${extra}</body></html>`;

test("standalone filename is deterministic and package-driven", () => {
  assert.equal(standaloneFilename({ company: { slug: "vpec-2455", ticker: "2455" }, asOfDate: "2026-08-27" }), "VPEC_2455_2026-08-27_full_report.html");
});

test("standalone validation accepts a self-contained full report", () => {
  const result = validateStandaloneHtml(fixture(), { expectedPages: 14, profileName: "full-research", slug: "vpec-2455" });
  assert.deepEqual(result, { pageCount: 14, sourcePages: 14, payloadProfile: "full-research" });
});

test("standalone validation rejects runtime network dependencies", () => {
  assert.throws(() => validateStandaloneHtml(fixture("<script>fetch('/api/research')</script>"), { expectedPages: 14, profileName: "full-research", slug: "vpec-2455" }), /runtime fetch/);
  assert.throws(() => validateStandaloneHtml(fixture('<script src="https://example.com/chart.js"></script>'), { expectedPages: 14, profileName: "full-research", slug: "vpec-2455" }), /external script source/);
});

test("standalone validation rejects page and payload regressions", () => {
  const short = fixture().replace('<section class="page"></section>', "");
  assert.throws(() => validateStandaloneHtml(short, { expectedPages: 14, profileName: "full-research", slug: "vpec-2455" }), /expected 14 source pages, found 13/);
  assert.throws(() => validateStandaloneHtml(fixture().replace('"full-research"', '"experiment-summary"'), { expectedPages: 14, profileName: "full-research", slug: "vpec-2455" }), /expected profile full-research/);
});

test("baseline validation distinguishes source pages from rendered pages", () => {
  const baseline = fixture('<script id="v7-safe-pagination-script">/* pagination */</script>')
    .replaceAll('<section class="page"></section>', "")
    .replace("<body>", `<body>${Array.from({ length: 8 }, () => '<section class="page"></section>').join("")}`);
  const result = validateStandaloneHtml(baseline, { expectedPages: 14, sourcePages: 8, profileName: "full-research", slug: "vpec-2455" });
  assert.deepEqual(result, { pageCount: 14, sourcePages: 8, payloadProfile: "full-research" });
});

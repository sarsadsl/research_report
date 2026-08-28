import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { buildReportViewModel, injectFullReportMetadata, renderGeneratedReport } from "./report-renderer.mjs";

const report = {
  sources: [
    "report_sources/vpec-2455.v4.part01a", "report_sources/vpec-2455.v4.part01b",
    "report_sources/vpec-2455.v4.part01c", "report_sources/vpec-2455.v4.part01d",
    "report_sources/vpec-2455.v4.part01e", "report_sources/vpec-2455.v4.part02",
    "report_sources/vpec-2455.v4.part03", "report_sources/vpec-2455.v4.part04",
    "report_sources/vpec-2455.v4.part05", "report_sources/vpec-2455.v4.part06",
  ],
  byteLength: 98309,
  sha256: "b7092685eab8bfb3479723b29771c746d1cb94e70edef41afa373493745c4ea8",
};

const [pkg, profileDocument, layoutCss, layoutJs] = await Promise.all([
  readFile("research/vpec-2455/research-package.json", "utf8").then(JSON.parse),
  readFile("research/vpec-2455/report-profiles.json", "utf8").then(JSON.parse),
  readFile("report_sources/vpec-layout-v7.css", "utf8"),
  readFile("report_sources/vpec-layout-v7.js", "utf8"),
]);
if (profileDocument.schemaVersion !== "1.0.0") throw new Error("Unsupported report profile schema");

const parts = await Promise.all(report.sources.map((file) => readFile(file, "utf8")));
const canonical = gunzipSync(Buffer.from(parts.join("").replace(/\s+/g, ""), "base64"));
const canonicalDigest = createHash("sha256").update(canonical).digest("hex");
if (canonical.length !== report.byteLength || canonicalDigest !== report.sha256) {
  throw new Error(`Canonical report verification failed: bytes=${canonical.length}, sha256=${canonicalDigest}`);
}

const fullProfile = profileDocument.profiles["full-research"];
const fullVm = buildReportViewModel(pkg, "full-research", fullProfile);
let fullHtml = injectFullReportMetadata(canonical.toString("utf8"), fullVm);
const readerMarker = "\n<script>\n(() => {";
const markerAt = fullHtml.lastIndexOf(readerMarker);
if (markerAt < 0) throw new Error("Reader bootstrap marker not found in full report");
const patch = `\n<style id="v7-safe-pagination-style">\n${layoutCss}\n</style>\n<script id="v7-safe-pagination-script">\n${layoutJs}\n</script>`;
fullHtml = fullHtml.slice(0, markerAt) + patch + fullHtml.slice(markerAt);

const experimentProfile = profileDocument.profiles["experiment-summary"];
const experimentVm = buildReportViewModel(pkg, "experiment-summary", experimentProfile);
const experimentHtml = renderGeneratedReport(experimentVm);

for (const [target, html] of [[fullProfile.output, fullHtml], [experimentProfile.output, experimentHtml]]) {
  await mkdir(dirname(target), { recursive:true });
  await writeFile(target, html, "utf8");
  const digest = createHash("sha256").update(html).digest("hex");
  console.log(`Materialized ${target} (${Buffer.byteLength(html)} bytes/${digest})`);
}

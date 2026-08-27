import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { dirname } from "node:path";

const reports = [
  {
    sources: [
      "report_sources/vpec-2455.v4.part01a",
      "report_sources/vpec-2455.v4.part01b",
      "report_sources/vpec-2455.v4.part01c",
      "report_sources/vpec-2455.v4.part01d",
      "report_sources/vpec-2455.v4.part01e",
      "report_sources/vpec-2455.v4.part02",
      "report_sources/vpec-2455.v4.part03",
      "report_sources/vpec-2455.v4.part04",
      "report_sources/vpec-2455.v4.part05",
      "report_sources/vpec-2455.v4.part06",
    ],
    target: "public/research/reports/vpec-2455.html",
    byteLength: 98309,
    sha256: "b7092685eab8bfb3479723b29771c746d1cb94e70edef41afa373493745c4ea8",
  },
];

const layoutCss = await readFile("report_sources/vpec-layout-v6.css", "utf8");
const layoutJs = await readFile("report_sources/vpec-layout-v6.js", "utf8");
const readerMarker = "\n<script>\n(() => {";

for (const report of reports) {
  const parts = await Promise.all(report.sources.map((path) => readFile(path, "utf8")));
  const encoded = parts.join("").replace(/\s+/g, "");
  const canonical = gunzipSync(Buffer.from(encoded, "base64"));
  const canonicalDigest = createHash("sha256").update(canonical).digest("hex");
  if (canonical.length !== report.byteLength || canonicalDigest !== report.sha256) {
    throw new Error(`Canonical report verification failed for ${report.target}: bytes=${canonical.length}, sha256=${canonicalDigest}`);
  }

  const html = canonical.toString("utf8");
  const markerAt = html.lastIndexOf(readerMarker);
  if (markerAt < 0) throw new Error(`Reader bootstrap marker not found in ${report.target}`);
  const patch = `\n<style id="v6-auto-pagination-performance-style">\n${layoutCss}\n</style>\n<script id="v6-auto-pagination-performance-script">\n${layoutJs}\n</script>`;
  const deployed = html.slice(0, markerAt) + patch + html.slice(markerAt);
  const deployedBytes = Buffer.from(deployed, "utf8");
  const deployedDigest = createHash("sha256").update(deployedBytes).digest("hex");

  await mkdir(dirname(report.target), { recursive: true });
  await writeFile(report.target, deployedBytes);
  console.log(`Materialized ${report.target} (canonical ${canonical.length} bytes/${canonicalDigest}; deployed ${deployedBytes.length} bytes/${deployedDigest}; reader=v6-performance)`);
}

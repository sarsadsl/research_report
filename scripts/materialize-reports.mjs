import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { dirname } from "node:path";

const reports = [
  {
    source: "report_sources/vpec-2455.v4.html.gz.b64",
    target: "public/research/reports/vpec-2455.html",
  },
];

for (const report of reports) {
  const encoded = (await readFile(report.source, "utf8")).trim();
  const html = gunzipSync(Buffer.from(encoded, "base64"));
  await mkdir(dirname(report.target), { recursive: true });
  await writeFile(report.target, html);
  console.log(`Materialized ${report.target} (${html.length} bytes)`);
}

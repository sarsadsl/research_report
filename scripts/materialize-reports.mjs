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

for (const report of reports) {
  const parts = await Promise.all(report.sources.map((path) => readFile(path, "utf8")));
  const encoded = parts.join("").replace(/\s+/g, "");
  const html = gunzipSync(Buffer.from(encoded, "base64"));
  const digest = createHash("sha256").update(html).digest("hex");
  if (html.length !== report.byteLength || digest !== report.sha256) {
    throw new Error(
      `Canonical report verification failed for ${report.target}: bytes=${html.length}, sha256=${digest}`,
    );
  }

  await mkdir(dirname(report.target), { recursive: true });
  await writeFile(report.target, html);
  console.log(`Materialized ${report.target} (${html.length} bytes, sha256=${digest})`);
}

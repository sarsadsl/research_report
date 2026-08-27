import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { dirname } from "node:path";

const reports = [
  {
    sources: Array.from(
      { length: 6 },
      (_, i) => `report_sources/vpec-2455.v4.part${String(i + 1).padStart(2, "0")}`,
    ),
    target: "public/research/reports/vpec-2455.html",
    encodedLength: 36356,
    byteLength: 98309,
    sha256: "b7092685eab8bfb3479723b29771c746d1cb94e70edef41afa373493745c4ea8",
  },
];

for (const report of reports) {
  const parts = await Promise.all(report.sources.map((path) => readFile(path, "utf8")));
  const encoded = parts.join("").replace(/\s+/g, "");
  if (encoded.length !== report.encodedLength) {
    throw new Error(`Unexpected encoded report size for ${report.target}: ${encoded.length}`);
  }

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

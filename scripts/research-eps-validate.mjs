import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertSafeSlug, loadResearch } from "./research-lib.mjs";
import { verifyEpsDataset } from "./research-eps-lib.mjs";

const args = process.argv.slice(2);
let dataset;
if (args[0] === "--slug") {
  const slug = args[1];
  if (!slug) throw new Error("Usage: npm run research:verify-eps -- --slug <research-slug>");
  assertSafeSlug(slug);
  const { researchPackage } = await loadResearch(slug);
  dataset = {
    company: researchPackage.company,
    sources: researchPackage.sources,
    records: researchPackage.actuals,
  };
} else {
  const inputPath = args[0];
  if (!inputPath) throw new Error("Usage: npm run research:verify-eps -- <verification-json> | --slug <research-slug>");
  const absolutePath = path.resolve(process.cwd(), inputPath);
  dataset = JSON.parse(await readFile(absolutePath, "utf8"));
}
const result = verifyEpsDataset(dataset);
console.log(JSON.stringify({
  result: result.status,
  company: dataset.company,
  sourceCount: dataset.sources.length,
  ...result,
}, null, 2));
if (result.status !== "PASS") process.exitCode = 1;

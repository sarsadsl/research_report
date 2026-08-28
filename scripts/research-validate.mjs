import { assertSafeSlug, assertValid, validateSlug } from "./research-lib.mjs";

const slug = process.argv[2];
if (!slug) throw new Error("Usage: npm run research:validate -- <slug>");
assertSafeSlug(slug);
const { researchPackage: pkg, result } = await validateSlug(slug);
assertValid(result);
console.log(JSON.stringify({
  result: "PASS",
  research: `${pkg.company.name} ${pkg.company.ticker}`,
  slug,
  packageVersion: pkg.packageVersion,
  asOfDate: pkg.asOfDate,
  packageHash: result.packageHash,
  manifestHash: result.manifestHash,
  counts: result.counts,
}, null, 2));


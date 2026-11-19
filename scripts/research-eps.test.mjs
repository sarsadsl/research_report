import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { verifyEpsDataset } from "./research-eps-lib.mjs";
import { validateResearch } from "./research-lib.mjs";

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const clone = (value) => structuredClone(value);

test("official UMC EPS inputs recompute for all seven distinct periods", async () => {
  const dataset = await readJson("verification/fixtures/umc-2303-eps.json");
  const result = verifyEpsDataset(dataset);
  assert.equal(result.status, "PASS");
  assert.deepEqual(result.counts, { total: 7, pass: 7, notVerified: 0, fail: 0 });
  assert.deepEqual(result.checks.map((check) => check.roundedEps), [4.93, 3.8, 3.34, 0.81, 1.29, 3.39, 1.32]);
});

test("reported EPS mismatch fails the calculation check", async () => {
  const dataset = await readJson("verification/fixtures/umc-2303-eps.json");
  dataset.records[0].eps = 4.94;
  const result = verifyEpsDataset(dataset);
  assert.equal(result.status, "FAIL");
  assert.match(result.checks[0].errors.join("\n"), /does not match reported EPS/);
});

test("EPS without calculation inputs is surfaced as NOT_VERIFIED", async () => {
  const dataset = await readJson("verification/fixtures/umc-2303-eps.json");
  delete dataset.records[0].epsCalculation;
  const result = verifyEpsDataset(dataset);
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.counts.notVerified, 1);
  assert.equal(result.checks[0].status, "NOT_VERIFIED");
});

test("EPS calculation sources must exist and match the record provenance", async () => {
  const dataset = await readJson("verification/fixtures/umc-2303-eps.json");
  dataset.records[0].epsCalculation.denominator.sourceId = "missing-source";
  const result = verifyEpsDataset(dataset);
  assert.equal(result.status, "FAIL");
  assert.ok(result.checks[0].errors.some((error) => error.includes("unknown source missing-source")));
  assert.ok(result.checks[0].errors.some((error) => error.includes("must also appear in actual sourceIds")));
});

test("EPS validation rejects mixed accounting bases across periods", async () => {
  const dataset = await readJson("verification/fixtures/umc-2303-eps.json");
  dataset.records[1].epsCalculation.accountingBasis = "IFRS consolidated";
  const result = verifyEpsDataset(dataset);
  assert.equal(result.status, "FAIL");
  assert.ok(result.errors.some((error) => error.includes("mixed accountingBasis")));
});

test("EPS records must use the company's declared accounting basis", async () => {
  const dataset = await readJson("verification/fixtures/umc-2303-eps.json");
  dataset.company.accountingBasis = "IFRS consolidated";
  const result = verifyEpsDataset(dataset);
  assert.equal(result.status, "FAIL");
  assert.ok(result.errors.some((error) => error.includes("does not match company basis")));
});

test("research package validation exposes legacy EPS rows as NOT_VERIFIED", async () => {
  const input = {
    manifest: await readJson("research/vpec-2455/manifest.json"),
    researchPackage: await readJson("research/vpec-2455/research-package.json"),
    manifestSchema: await readJson("research_system/schemas/research-manifest-v1.schema.json"),
    packageSchema: await readJson("research_system/schemas/research-package-v1.schema.json"),
  };
  const result = validateResearch(input);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.epsVerification.status, "PARTIAL");
  assert.equal(
    result.epsVerification.counts.notVerified,
    input.researchPackage.actuals.filter((row) => typeof row.eps === "number" && row.epsCalculation == null).length,
  );
});

test("EPS schema and package validator reject a supplied wrong result", async () => {
  const input = {
    manifest: await readJson("research/vpec-2455/manifest.json"),
    researchPackage: await readJson("research/vpec-2455/research-package.json"),
    manifestSchema: await readJson("research_system/schemas/research-manifest-v1.schema.json"),
    packageSchema: await readJson("research_system/schemas/research-package-v1.schema.json"),
  };
  const dataset = await readJson("verification/fixtures/umc-2303-eps.json");
  const row = input.researchPackage.actuals[0];
  row.eps = 9.99;
  row.epsCalculation = clone(dataset.records[0].epsCalculation);
  row.epsCalculation.numerator.sourceId = "vpec-src-official";
  row.epsCalculation.denominator.sourceId = "vpec-src-official";
  const result = validateResearch(input);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("does not match reported EPS")));
});

test("research package accepts a sourced and reconciled EPS calculation", async () => {
  const input = {
    manifest: await readJson("research/vpec-2455/manifest.json"),
    researchPackage: await readJson("research/vpec-2455/research-package.json"),
    manifestSchema: await readJson("research_system/schemas/research-manifest-v1.schema.json"),
    packageSchema: await readJson("research_system/schemas/research-package-v1.schema.json"),
  };
  const dataset = await readJson("verification/fixtures/umc-2303-eps.json");
  const row = input.researchPackage.actuals[0];
  const previouslyUnverified = input.researchPackage.actuals.filter((candidate) => typeof candidate.eps === "number" && candidate.epsCalculation == null).length;
  row.eps = dataset.records[0].eps;
  row.epsCalculation = clone(dataset.records[0].epsCalculation);
  row.epsCalculation.numerator.sourceId = "vpec-src-official";
  row.epsCalculation.denominator.sourceId = "vpec-src-official";
  const result = validateResearch(input);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.epsVerification.counts.pass, 1);
  assert.equal(result.epsVerification.counts.notVerified, previouslyUnverified - 1);
});

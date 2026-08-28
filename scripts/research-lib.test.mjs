import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateResearch } from "./research-lib.mjs";

const load = async () => ({
  manifest: JSON.parse(await readFile("research/vpec-2455/manifest.json", "utf8")),
  researchPackage: JSON.parse(await readFile("research/vpec-2455/research-package.json", "utf8")),
  manifestSchema: JSON.parse(await readFile("research_system/schemas/research-manifest-v1.schema.json", "utf8")),
  packageSchema: JSON.parse(await readFile("research_system/schemas/research-package-v1.schema.json", "utf8")),
});
const clone = (value) => structuredClone(value);

test("2455 reference package passes schema and domain validation", async () => {
  const input = await load();
  const result = validateResearch(input);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.match(result.packageHash, /^[a-f0-9]{64}$/);
});

test("unknown source reference fails", async () => {
  const input = await load();
  input.researchPackage.actuals[0].sourceIds = ["missing-source"];
  const result = validateResearch(input);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("missing source")));
});

test("duplicate monthly period fails", async () => {
  const input = await load();
  input.researchPackage.monthlyRevenue.push(clone(input.researchPackage.monthlyRevenue[0]));
  input.researchPackage.monthlyRevenue.at(-1).id = "new-id";
  const result = validateResearch(input);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("monthlyRevenue: duplicate key")));
});

test("estimated segment must be labeled as inference or consensus", async () => {
  const input = await load();
  const row = input.researchPackage.segments.find((item) => item.isEstimate);
  row.evidenceClass = "official";
  const result = validateResearch(input);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("estimate must be")));
});

test("forecast scenario ordering fails when bull is below consensus", async () => {
  const input = await load();
  input.researchPackage.forecasts.find((row) => row.fiscalYear === 2027 && row.scenario === "bull").revenue = 100;
  const result = validateResearch(input);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("bear <= consensus <= bull")));
});

test("JSON Schema rejects additional top-level properties", async () => {
  const input = await load();
  input.researchPackage.unexpected = true;
  const result = validateResearch(input);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("additional property")));
});

test("manifest and package report versions must match", async () => {
  const input = await load();
  input.manifest.reportVersion = "different";
  const result = validateResearch(input);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("reportVersion")));
});

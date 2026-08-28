import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const COLLECTIONS = [
  "actuals",
  "monthlyRevenue",
  "segments",
  "forecasts",
  "capacity",
  "catalysts",
  "risks",
  "signalRules",
  "signalSnapshots",
];

export function assertSafeSlug(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`Invalid research slug: ${slug}`);
  }
}

export function researchPaths(slug, root = process.cwd()) {
  assertSafeSlug(slug);
  return {
    manifest: path.join(root, "research", slug, "manifest.json"),
    package: path.join(root, "research", slug, "research-package.json"),
    manifestSchema: path.join(root, "research_system", "schemas", "research-manifest-v1.schema.json"),
    packageSchema: path.join(root, "research_system", "schemas", "research-package-v1.schema.json"),
  };
}

export async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function loadResearch(slug, root = process.cwd()) {
  const files = researchPaths(slug, root);
  const [manifest, researchPackage, manifestSchema, packageSchema] = await Promise.all([
    readJson(files.manifest),
    readJson(files.package),
    readJson(files.manifestSchema),
    readJson(files.packageSchema),
  ]);
  return { manifest, researchPackage, manifestSchema, packageSchema, files };
}

function decodePointerToken(token) {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

function resolveRef(rootSchema, ref) {
  if (!ref.startsWith("#/")) throw new Error(`Only local JSON Schema refs are supported: ${ref}`);
  return ref.slice(2).split("/").map(decodePointerToken).reduce((value, key) => value?.[key], rootSchema);
}

function valueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  if (typeof value === "number") return "number";
  return typeof value;
}

function acceptsType(value, expected) {
  const actual = valueType(value);
  if (expected === "number") return actual === "number" || actual === "integer";
  return actual === expected;
}

function validIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function validateJsonSchema(value, schema, rootSchema = schema, at = "$", errors = []) {
  if (schema.$ref) {
    const resolved = resolveRef(rootSchema, schema.$ref);
    if (!resolved) errors.push(`${at}: unresolved schema ref ${schema.$ref}`);
    else validateJsonSchema(value, resolved, rootSchema, at, errors);
    return errors;
  }
  if (Object.hasOwn(schema, "const") && value !== schema.const) errors.push(`${at}: must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some((candidate) => Object.is(candidate, value))) errors.push(`${at}: must be one of ${schema.enum.join(", ")}`);

  if (schema.type) {
    const expected = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!expected.some((type) => acceptsType(value, type))) {
      errors.push(`${at}: expected ${expected.join("|")}, got ${valueType(value)}`);
      return errors;
    }
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${at}: shorter than minLength ${schema.minLength}`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${at}: longer than maxLength ${schema.maxLength}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${at}: does not match ${schema.pattern}`);
    if (schema.format === "date" && !validIsoDate(value)) errors.push(`${at}: invalid ISO date`);
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${at}: below minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${at}: above maximum ${schema.maximum}`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${at}: fewer than ${schema.minItems} items`);
    if (schema.uniqueItems) {
      const seen = new Set();
      value.forEach((item, index) => {
        const key = canonicalJson(item);
        if (seen.has(key)) errors.push(`${at}[${index}]: duplicate array item`);
        seen.add(key);
      });
    }
    if (schema.items) value.forEach((item, index) => validateJsonSchema(item, schema.items, rootSchema, `${at}[${index}]`, errors));
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) errors.push(`${at}: missing required property ${key}`);
    }
    const properties = schema.properties ?? {};
    for (const [key, child] of Object.entries(value)) {
      if (properties[key]) validateJsonSchema(child, properties[key], rootSchema, `${at}.${key}`, errors);
      else if (schema.additionalProperties === false) errors.push(`${at}.${key}: additional property is not allowed`);
    }
  }
  return errors;
}

function duplicateKeys(rows, keyFor, label, errors) {
  const seen = new Set();
  for (const row of rows) {
    const key = keyFor(row);
    if (seen.has(key)) errors.push(`${label}: duplicate key ${key}`);
    seen.add(key);
  }
}

function validateReferences(pkg, errors) {
  const sources = new Set(pkg.sources.map((row) => row.id));
  const claims = new Set(pkg.claims.map((row) => row.id));
  const globalIds = new Map();

  for (const collection of [...COLLECTIONS, "sections", "sources", "claims"]) {
    for (const row of pkg[collection]) {
      if (globalIds.has(row.id)) errors.push(`ids: ${row.id} reused by ${globalIds.get(row.id)} and ${collection}`);
      globalIds.set(row.id, collection);
      for (const sourceId of row.sourceIds ?? []) if (!sources.has(sourceId)) errors.push(`${collection}.${row.id}: missing source ${sourceId}`);
      for (const claimId of row.claimIds ?? []) if (!claims.has(claimId)) errors.push(`${collection}.${row.id}: missing claim ${claimId}`);
    }
  }

  for (const claim of pkg.claims) {
    for (const sourceId of claim.sourceIds) if (!sources.has(sourceId)) errors.push(`claims.${claim.id}: missing source ${sourceId}`);
    for (const inputId of claim.inputClaimIds) if (!claims.has(inputId)) errors.push(`claims.${claim.id}: missing input claim ${inputId}`);
    if (claim.inputClaimIds.includes(claim.id)) errors.push(`claims.${claim.id}: claim cannot depend on itself`);
  }
  for (const claimId of pkg.thesis.claimIds) if (!claims.has(claimId)) errors.push(`thesis: missing claim ${claimId}`);

  const allowedPayloads = new Set(["thesis", ...COLLECTIONS, "sections", "sources", "claims"]);
  for (const section of pkg.sections) {
    for (const ref of section.payloadRefs) if (!allowedPayloads.has(ref)) errors.push(`sections.${section.id}: unknown payload ref ${ref}`);
  }
}

function validateDomain(manifest, pkg, errors) {
  if (manifest.slug !== pkg.company.slug || manifest.ticker !== pkg.company.ticker || manifest.market !== pkg.company.market) {
    errors.push("identity: manifest and package company identity differ");
  }
  if (pkg.report.slug !== pkg.company.slug) errors.push("identity: report slug and company slug differ");
  if (manifest.reportVersion !== pkg.report.version) errors.push("identity: manifest reportVersion and package report.version differ");
  if (pkg.report.status === "published" && !pkg.report.publishedAt) errors.push("report: published report requires publishedAt");
  if (manifest.output.fullReport && pkg.sections.length === 0) errors.push("manifest: fullReport requires sections");
  if (manifest.output.standalone && !manifest.output.fullReport) errors.push("manifest: standalone requires fullReport");

  duplicateKeys(pkg.actuals, (row) => row.period, "actuals", errors);
  duplicateKeys(pkg.monthlyRevenue, (row) => `${row.year}-${row.month}`, "monthlyRevenue", errors);
  duplicateKeys(pkg.segments, (row) => `${row.period}|${row.segment}`, "segments", errors);
  duplicateKeys(pkg.forecasts, (row) => `${row.fiscalYear}|${row.scenario}`, "forecasts", errors);
  duplicateKeys(pkg.signalRules, (row) => row.metric, "signalRules", errors);
  duplicateKeys(pkg.signalSnapshots, (row) => `${row.asOfDate}|${row.metric}`, "signalSnapshots", errors);
  duplicateKeys(pkg.sections, (row) => row.sortOrder, "sections.sortOrder", errors);

  for (const segment of pkg.segments) {
    if (segment.isEstimate && !["research_inference", "market_consensus"].includes(segment.evidenceClass)) {
      errors.push(`segments.${segment.id}: estimate must be research_inference or market_consensus`);
    }
    if (!segment.isEstimate && segment.evidenceClass === "research_inference") {
      errors.push(`segments.${segment.id}: research inference must set isEstimate=true`);
    }
  }

  const segmentGroups = Map.groupBy(pkg.segments, (row) => row.period);
  for (const [period, rows] of segmentGroups) {
    const complete = rows.length > 1 && rows.every((row) => !row.isEstimate && typeof row.share === "number");
    if (complete) {
      const total = rows.reduce((sum, row) => sum + row.share, 0);
      if (Math.abs(total - 100) > 0.5) errors.push(`segments.${period}: shares total ${total}, expected 100±0.5`);
    }
  }

  const forecastGroups = Map.groupBy(pkg.forecasts, (row) => row.fiscalYear);
  for (const [year, rows] of forecastGroups) {
    const byScenario = Object.fromEntries(rows.map((row) => [row.scenario, row]));
    for (const metric of ["revenue", "eps"]) {
      const values = ["bear", "consensus", "bull"].map((scenario) => byScenario[scenario]?.[metric]);
      if (values.every((value) => typeof value === "number") && !(values[0] <= values[1] && values[1] <= values[2])) {
        errors.push(`forecasts.${year}.${metric}: expected bear <= consensus <= bull`);
      }
    }
  }
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : canonicalJson(value)).digest("hex");
}

export function validateResearch({ manifest, researchPackage, manifestSchema, packageSchema }) {
  const errors = [];
  validateJsonSchema(manifest, manifestSchema, manifestSchema, "$manifest", errors);
  validateJsonSchema(researchPackage, packageSchema, packageSchema, "$package", errors);
  if (errors.length === 0) {
    validateReferences(researchPackage, errors);
    validateDomain(manifest, researchPackage, errors);
  }
  return {
    ok: errors.length === 0,
    errors,
    packageHash: sha256(researchPackage),
    manifestHash: sha256(manifest),
    counts: Object.fromEntries([...COLLECTIONS, "sections", "sources", "claims"].map((key) => [key, researchPackage[key]?.length ?? 0])),
  };
}

export async function validateSlug(slug, root = process.cwd()) {
  const loaded = await loadResearch(slug, root);
  return { ...loaded, result: validateResearch(loaded) };
}

export function assertValid(result) {
  if (!result.ok) {
    throw new Error(["Research package validation failed:", ...result.errors.map((error) => `- ${error}`)].join("\n"));
  }
}

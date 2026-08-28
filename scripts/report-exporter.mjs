import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function standaloneFilename(pkg) {
  const prefix = String(pkg.company.slug).split("-")[0].replace(/[^a-z0-9]/gi, "").toUpperCase();
  const ticker = String(pkg.company.ticker).replace(/[^a-z0-9]/gi, "").toUpperCase();
  const date = String(pkg.asOfDate);
  if (!prefix || !ticker || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Research Package cannot produce a safe standalone filename");
  }
  return `${prefix}_${ticker}_${date}_full_report.html`;
}

function extractPayload(html) {
  const match = html.match(/<script\b[^>]*\bid=["']research-report-payload["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return undefined;
  }
}

export function validateStandaloneHtml(html, { expectedPages, sourcePages = expectedPages, profileName, slug }) {
  const errors = [];
  const pageCount = Math.max(
    (html.match(/<section\b[^>]*class=["'][^"']*\bpage\b/gi) || []).length,
    (html.match(/<section\b[^>]*class=["'][^"']*\bslide\b/gi) || []).length,
  );
  const payload = extractPayload(html);

  if (!/^\s*<!doctype html>/i.test(html)) errors.push("doctype is missing");
  if (!/<meta\b[^>]*charset=/i.test(html)) errors.push("charset metadata is missing");
  if (!/<meta\b[^>]*name=["']viewport["']/i.test(html)) errors.push("viewport metadata is missing");
  if (pageCount !== sourcePages) errors.push(`expected ${sourcePages} source pages, found ${pageCount}`);
  if (payload === null) errors.push("research-report-payload is missing");
  if (payload === undefined) errors.push("research-report-payload is invalid JSON");
  if (payload && payload.profileName !== profileName) errors.push(`expected profile ${profileName}, found ${payload.profileName}`);
  if (payload && payload.company?.slug !== slug) errors.push(`expected slug ${slug}, found ${payload.company?.slug}`);
  if (payload && payload.profile?.expectedPages !== expectedPages) errors.push(`expected rendered page target ${expectedPages}, found ${payload.profile?.expectedPages}`);
  if (!/window\.__researchLayout/.test(html)) errors.push("research layout diagnostics are missing");
  if (sourcePages !== expectedPages && !/id=["']v7-safe-pagination-script["']/.test(html)) errors.push("safe pagination runtime is missing");
  if (/\bfetch\s*\(/.test(html)) errors.push("runtime fetch is not allowed");
  if (/<script\b[^>]*\bsrc\s*=/i.test(html)) errors.push("external script source is not allowed");
  if (/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref\s*=/i.test(html)) errors.push("external stylesheet is not allowed");
  if (/<(?:img|audio|video|source)\b[^>]*\bsrc\s*=\s*["']https?:/i.test(html)) errors.push("external media source is not allowed");
  if (/@import\s+(?:url\()?\s*["']?https?:/i.test(html)) errors.push("external CSS import is not allowed");
  if (/url\(\s*["']?https?:/i.test(html)) errors.push("external CSS asset is not allowed");

  if (errors.length) {
    throw new Error(["Standalone report validation failed:", ...errors.map((error) => `- ${error}`)].join("\n"));
  }
  return { pageCount: expectedPages, sourcePages: pageCount, payloadProfile: payload.profileName };
}

export async function exportStandaloneReport({ rootDir = process.cwd(), slug, materialize = true } = {}) {
  if (!slugPattern.test(slug ?? "")) throw new Error("Usage: npm run report:export -- <slug>");

  const researchDir = resolve(rootDir, "research", slug);
  const [packageText, manifestText, profilesText] = await Promise.all([
    readFile(join(researchDir, "research-package.json"), "utf8"),
    readFile(join(researchDir, "manifest.json"), "utf8"),
    readFile(join(researchDir, "report-profiles.json"), "utf8"),
  ]);
  const pkg = JSON.parse(packageText);
  const manifest = JSON.parse(manifestText);
  const profiles = JSON.parse(profilesText);

  if (pkg.company?.slug !== slug || manifest.slug !== slug) throw new Error(`Slug mismatch for ${slug}`);
  if (manifest.output?.standalone !== true) throw new Error(`${slug}: manifest output.standalone must be true`);

  const fullProfile = profiles.profiles?.["full-research"];
  if (!fullProfile) throw new Error(`${slug}: full-research profile is required`);

  if (materialize) {
    const result = spawnSync(process.execPath, ["scripts/materialize-reports.mjs"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Report materialization failed with exit code ${result.status}`);
  }

  const sourcePath = resolve(rootDir, fullProfile.output);
  const html = await readFile(sourcePath, "utf8");
  const qc = validateStandaloneHtml(html, {
    expectedPages: fullProfile.expectedPages,
    sourcePages: fullProfile.sourcePages ?? fullProfile.expectedPages,
    profileName: "full-research",
    slug,
  });

  const outputPath = resolve(rootDir, "exports", standaloneFilename(pkg));
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");

  const exportedHtml = await readFile(outputPath, "utf8");
  if (exportedHtml !== html) throw new Error("Standalone byte-for-byte verification failed");

  return {
    slug,
    outputPath,
    fileName: standaloneFilename(pkg),
    pages: qc.pageCount,
    sourcePages: qc.sourcePages,
    bytes: Buffer.byteLength(exportedHtml),
    reportHash: sha256(exportedHtml),
    packageHash: sha256(packageText),
    profile: qc.payloadProfile,
    runtimeFetch: 0,
    externalAssets: 0,
    identicalToWebsite: true,
  };
}

async function main() {
  const result = await exportStandaloneReport({ slug: process.argv[2] });
  console.log([
    `Research: ${result.slug}`,
    `Output: ${result.outputPath}`,
    `Pages: ${result.pages}`,
    `Source pages: ${result.sourcePages}`,
    `Profile: ${result.profile}`,
    `Runtime fetch: ${result.runtimeFetch}`,
    `External assets: ${result.externalAssets}`,
    `Website parity: ${result.identicalToWebsite ? "PASS" : "FAIL"}`,
    `Bytes: ${result.bytes}`,
    `Package SHA-256: ${result.packageHash}`,
    `Report SHA-256: ${result.reportHash}`,
    "RESULT: READY TO DELIVER",
  ].join("\n"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { assertSafeSlug, assertValid, sha256, validateSlug } from "./research-lib.mjs";
import {
  buildRunMetadata,
  extractWranglerRows,
  parseImportArgs,
  runRecordSql,
  verificationSql,
  verifyImportRow,
} from "./research-import-lib.mjs";

const options = parseImportArgs(process.argv.slice(2));
const { slug } = options;
assertSafeSlug(slug);
const mode = `--${options.target}`;
const { researchPackage: pkg, result } = await validateSlug(slug);
assertValid(result);

const generation = spawnSync(process.execPath, ["scripts/research-generate.mjs", slug, "--check"], { stdio: "inherit" });
if (generation.status !== 0) process.exit(generation.status ?? 1);

const database = process.env.RESEARCH_D1_DATABASE || "research-report-db";
const sqlFile = path.join("db", "seed", `${pkg.company.ticker}.sql`);
const wrangler = path.join("node_modules", "wrangler", "bin", "wrangler.js");
const seed = await readFile(sqlFile, "utf8");
const reportFile = path.join("public", "research", "reports", `${slug}.html`);
const report = await readFile(reportFile, "utf8").catch(() => null);
const run = buildRunMetadata(pkg, {
  packageHash: result.packageHash,
  seedHash: sha256(seed),
  reportHash: report ? sha256(report) : null,
  importedAt: new Date().toISOString(),
});

console.log(JSON.stringify({
  research: `${pkg.company.name} ${pkg.company.ticker}`,
  database,
  target: options.target,
  dryRun: options.dryRun,
  applyMigrations: options.applyMigrations,
  run,
}, null, 2));

if (options.dryRun) {
  console.log("DRY RUN: validation passed; D1 was not changed.");
  process.exit(0);
}

function runWrangler(args, spawnOptions = {}) {
  const execution = spawnSync(process.execPath, [wrangler, ...args], { encoding: "utf8", ...spawnOptions });
  if (execution.status !== 0) {
    if (execution.stdout) process.stdout.write(execution.stdout);
    if (execution.stderr) process.stderr.write(execution.stderr);
    process.exit(execution.status ?? 1);
  }
  return execution;
}

if (options.applyMigrations) {
  console.log(`Applying pending D1 migrations (${options.target})`);
  runWrangler(["d1", "migrations", "apply", database, mode], { stdio: "inherit", encoding: undefined });
}

const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "research-import-"));
try {
  const importFile = path.join(temporaryDirectory, `${slug}.sql`);
  await writeFile(importFile, `${seed}\n\n-- Record a successful canonical import.\n${runRecordSql(run)}`);
  console.log(`Importing ${pkg.company.name} ${pkg.company.ticker} into ${database} (${options.target})`);
  runWrangler(["d1", "execute", database, mode, "--yes", `--file=${importFile}`], { stdio: "inherit", encoding: undefined });

  const verification = runWrangler([
    "d1", "execute", database, mode, "--json", `--command=${verificationSql(run)}`,
  ]);
  const row = extractWranglerRows(verification.stdout)[0];
  const checked = verifyImportRow(row, run);
  if (!checked.ok) throw new Error(["D1 post-import verification failed:", ...checked.errors.map((error) => `- ${error}`)].join("\n"));
  console.log(`D1 import verified: ${run.id}`);
  console.log("RESULT: IMPORTED");
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

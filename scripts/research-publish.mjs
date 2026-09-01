import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assertValid, sha256, validateSlug } from "./research-lib.mjs";
import { buildRunMetadata } from "./research-import-lib.mjs";
import { runReportQc } from "./report-qc.mjs";
import { standaloneFilename } from "./report-exporter.mjs";
import { assertUnchanged, executeRelease, parsePublishArgs } from "./research-publish-lib.mjs";

const hashBytes = bytes => createHash("sha256").update(bytes).digest("hex");
const normalized = path => path.replaceAll("\\", "/");

export async function hashFiles(root, files) {
  const entries = [];
  for (const file of [...new Set(files)].sort()) entries.push([normalized(file), hashBytes(await readFile(join(root, file)))]);
  return sha256(entries);
}

export async function treeFiles(root, directory) {
  const files = [];
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await treeFiles(root, path));
    else if (entry.isFile()) files.push(path);
    else throw new Error(`Unsupported release artifact: ${path}`);
  }
  return files;
}

export function runCommand(rootDir, command, args, extraEnv = {}, quiet = false) {
  const result = spawnSync(command, args, {
    cwd: rootDir, encoding: "utf8", shell: false, windowsHide: true,
    env: { ...process.env, ...extraEnv }, timeout: 15 * 60 * 1000, maxBuffer: 32 * 1024 * 1024,
  });
  if (!quiet) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  if (result.error || result.status !== 0) throw new Error(`${command} ${args[0]} failed (exit ${result.status ?? "unknown"})`);
  return result.stdout;
}

export function parseDeployment(output) {
  const versionId = output.match(/Current Version ID:\s*([a-f0-9-]{36})/i)?.[1];
  const urls = [...new Set(output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev\b/gi) ?? [])];
  return { status: "SUCCESS", versionId: versionId ?? null, urls };
}

export async function publishResearch(options, rootDir = process.cwd()) {
  const { slug, remote } = options;
  const releaseId = `${new Date().toISOString().replaceAll(/[:.]/g, "-")}-${randomUUID()}`;
  const artifactDir = join(rootDir, ".research-publish", releaseId);
  await mkdir(artifactDir, { recursive: true });
  const record = {
    schemaVersion: "1.0.0", releaseId, slug, target: remote ? "remote" : "dry-run",
    status: "RUNNING", startedAt: new Date().toISOString(),
    stages: Object.fromEntries(["validate", "build", "candidate", "qc", "seal", "import", "deploy"].map(name => [name, {status:"NOT_RUN"}])),
    manualReview: "NOT_RECORDED: content, accessibility and offline review remain operator responsibilities",
    ciRun: process.env.GITHUB_RUN_ID ?? null,
  };
  const node = (args, env, quiet) => runCommand(rootDir, process.execPath, args, env, quiet);
  const git = args => runCommand(rootDir, "git", args, {}, true);
  let pkg, validation, config, profileDocument;
  const profileOutputs = () => Object.values(profileDocument.profiles).map(profile => profile.output);
  const sourceFiles = () => git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
    .split("\0").filter(Boolean).filter(file => !profileOutputs().includes(file) && file !== "next-env.d.ts");
  const sourceHash = () => hashFiles(rootDir, [...sourceFiles(), "wrangler.jsonc"]);
  const builtHash = async () => hashFiles(rootDir, await treeFiles(rootDir, ".open-next"));
  const save = async data => {
    const temporary = join(artifactDir, "release.json.tmp");
    await writeFile(temporary, JSON.stringify(data, null, 2) + "\n");
    await rename(temporary, join(artifactDir, "release.json"));
    if (data.qc) await writeFile(join(artifactDir, "qc.json"), JSON.stringify(data.qc, null, 2) + "\n");
  };
  const actions = {
    save, sourceHash,
    async validate() {
      record.commit = git(["rev-parse", "HEAD"]).trim();
      const loaded = await validateSlug(slug, rootDir);
      pkg = loaded.researchPackage;
      validation = loaded.result;
      assertValid(validation);
      profileDocument = JSON.parse(await readFile(join(rootDir, "research", slug, "report-profiles.json"), "utf8"));
      config = JSON.parse(await readFile(join(rootDir, "wrangler.jsonc"), "utf8"));
      const binding = config.d1_databases?.find(item => item.binding === "RESEARCH_DB");
      if (!binding?.database_id || !binding.database_name) throw new Error("RESEARCH_DB config is required");
      if (config.main !== ".open-next/worker.js" || config.assets?.directory !== ".open-next/assets" || config.build?.command) {
        throw new Error("Unsupported publish config: expected prebuilt OpenNext worker/assets without a custom build command");
      }
      if (process.env.CLOUDFLARE_ENV || (process.env.RESEARCH_D1_DATABASE && process.env.RESEARCH_D1_DATABASE !== binding.database_name)) {
        throw new Error("Environment override conflicts with the release target");
      }
      if (profileDocument.profiles["full-research"]?.output !== `public/research/reports/${slug}.html`) throw new Error("Report profile/import path mismatch");
      if (pkg.report.status !== "published") throw new Error("Current publisher requires an already reviewed published package; lifecycle transitions are not implemented");
      record.database = { name: binding.database_name, id: binding.database_id };
      record.accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? config.account_id ?? null;
      record.worker = config.name;
      const excluded = profileOutputs().map(file => `:(exclude)${file}`);
      const dirty = git(["status", "--porcelain", "--", ".", ...excluded]);
      record.dirtyWorkspace = Boolean(dirty.trim());
      if (remote && record.dirtyWorkspace) throw new Error("Commit source changes before remote publishing");
      node(["scripts/research-generate.mjs", slug, "--check"]);
      const tests = (await readdir(join(rootDir, "scripts"))).filter(name => name.endsWith(".test.mjs")).sort().map(name => `scripts/${name}`);
      node(["--test", ...tests]);
      return sourceHash();
    },
    async build() {
      node(["node_modules/@opennextjs/cloudflare/dist/cli/index.js", "build"]);
    },
    async candidate() {
      for (const output of profileOutputs()) {
        const publicHash = hashBytes(await readFile(join(rootDir, output)));
        const assetHash = hashBytes(await readFile(join(rootDir, ".open-next/assets", output.replace(/^public\//, ""))));
        assertUnchanged(publicHash, assetHash);
      }
      const reportBytes = await readFile(join(rootDir, `public/research/reports/${slug}.html`));
      const reportText = reportBytes.toString("utf8");
      const reportHash = hashBytes(reportBytes);
      return {
        packageHash: validation.packageHash, manifestHash: validation.manifestHash,
        rawPackageHash: hashBytes(await readFile(join(rootDir, "research", slug, "research-package.json"))),
        sourceHash: sha256(pkg.sources), seedHash: hashBytes(await readFile(join(rootDir, "db/seed", `${pkg.company.ticker}.sql`))),
        reportHash, buildHash: await builtHash(), expectedPages: (reportText.match(/<section\b[^>]*class=["'][^"']*\b(?:page|slide)\b/gi) ?? []).length,
        reportVersion: pkg.report.version, packageVersion: pkg.packageVersion, asOfDate: pkg.asOfDate,
      };
    },
    qc: () => runReportQc({ slug, rootDir, materialize: false }),
    async verify(candidate, expectedSourceHash) {
      assertUnchanged(expectedSourceHash, await sourceHash());
      assertUnchanged(candidate.buildHash, await builtHash());
      for (const file of [`public/research/reports/${slug}.html`, `exports/${standaloneFilename(pkg)}`, `.open-next/assets/research/reports/${slug}.html`]) {
        assertUnchanged(candidate.reportHash, hashBytes(await readFile(join(rootDir, file))));
      }
    },
    async archive(data) {
      await copyFile(join(rootDir, "exports", standaloneFilename(pkg)), join(artifactDir, "report.html"));
      await writeFile(join(artifactDir, "qc.json"), JSON.stringify(data.qc, null, 2) + "\n");
    },
    async import(candidate) {
      const run = buildRunMetadata(pkg, { ...candidate, importedAt: new Date().toISOString() });
      const output = node(["scripts/research-import.mjs", slug, "--remote"], { RESEARCH_D1_DATABASE: record.database.name });
      if (!output.includes(`D1 import verified: ${run.id}`) || !output.includes("RESULT: IMPORTED")) throw new Error("Importer did not confirm verification");
      return { status: "VERIFIED", runId: run.id, rowCounts: run.rowCounts, reportHash: candidate.reportHash };
    },
    async deploy() {
      const output = node(["node_modules/wrangler/bin/wrangler.js", "deploy", "--config", "wrangler.jsonc"], { OPEN_NEXT_DEPLOY: "true" });
      return parseDeployment(output);
    },
  };
  console.log(`Release evidence: ${relative(rootDir, artifactDir)}`);
  return executeRelease(options, actions, record);
}

async function main() {
  const result = await publishResearch(parsePublishArgs(process.argv.slice(2)));
  console.log(`RESULT: ${result.status}\nRelease: ${result.releaseId}\nCommit: ${result.commit}\nReport SHA-256: ${result.candidate.reportHash}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}

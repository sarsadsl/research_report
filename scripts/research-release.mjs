import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstat, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { setTimeout as pause } from "node:timers/promises";
import { parseArgs } from "node:util";
import { assertSafeSlug } from "./research-lib.mjs";
import { assertReleaseQc } from "./research-publish-lib.mjs";
import { runReportQc } from "./report-qc.mjs";

const repo = "sarsadsl/research_report";
const production = "https://research-report.sarsadsl.workers.dev";
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

function command(bin, args, { allowBlocked = false, quiet = false } = {}) {
  const result = spawnSync(bin, args, {
    encoding: "utf8", shell: false, windowsHide: true, timeout: 45 * 60_000,
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, PYTHONUTF8: "1", GH_PROMPT_DISABLED: "1", GIT_TERMINAL_PROMPT: "0" },
  });
  if (result.error || (result.status !== 0 && !(allowBlocked && result.stdout?.trim()))) {
    throw new Error(`${bin} ${args[0]} failed (exit ${result.status ?? "unknown"}). ${result.stderr?.trim() ?? ""}`);
  }
  if (!quiet && result.stderr) process.stderr.write(result.stderr);
  return result.stdout.trim();
}

const node = (script, args, options) => command(process.execPath, [`scripts/${script}.mjs`, ...args], options);
const git = (...args) => command("git", args);
const gh = (...args) => command("gh", [...args, "-R", repo]);
const readJson = async file => JSON.parse(await readFile(file, "utf8"));

async function hasUnclearedPrimaryFinding(releases) {
  const reviews = [];
  for (const entry of await readdir(releases, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const prior = await readJson(`${releases}/${entry.name}/release.json`).catch(error => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    for (const review of prior?.reviews ?? []) {
      const severity = review.findingSummary?.severityCounts ?? {};
      if (review.reviewProvider === "agy-gemini" && (review.ok || severity.P0 > 0 || severity.P1 > 0)) {
        reviews.push(review);
      }
    }
  }
  reviews.sort((a, b) => a.completedAtUtc.localeCompare(b.completedAtUtc));
  return reviews.at(-1)?.ok === false;
}

async function applyRepair(dir, auditDir, round, slug) {
  const plan = await readJson(`.research-verification/${slug}/repairs/${round}.json`).catch(error => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!plan) return null;
  const target = `${dir}/research-package.json`;
  const previous = await readFile(target);
  if (!(await lstat(target)).isFile() || plan.expectedSha256 !== sha256(previous) ||
      plan.package?.company?.slug !== slug || typeof plan.reason !== "string" || !plan.reason.trim()) {
    throw new Error(`Repair ${round} is stale or invalid`);
  }
  const next = Buffer.from(JSON.stringify(plan.package, null, 2) + "\n");
  if (next.equals(previous)) throw new Error(`Repair ${round} did not change the package`);
  await writeFile(`${auditDir}/before-repair-${round}.json`, previous);
  const temporary = `${auditDir}/repair-${round}.tmp`;
  await writeFile(temporary, next);
  await rename(temporary, target);
  return { round, reason: plan.reason, previousSha256: plan.expectedSha256, nextSha256: sha256(next) };
}

async function waitForWorkflow(workflow, sha, event) {
  const until = Date.now() + 20 * 60_000;
  while (Date.now() < until) {
    const runs = JSON.parse(gh("run", "list", "--workflow", workflow, "--commit", sha, "--event", event,
      "--limit", "1", "--json", "databaseId,status,conclusion,url"));
    const run = runs[0];
    if (run?.status === "completed") {
      if (run.conclusion !== "success") throw new Error(`GitHub workflow ${run.conclusion}: ${run.url}`);
      return run.url;
    }
    await pause(10_000);
  }
  throw new Error(`Timed out waiting for ${workflow} for ${sha}`);
}

async function checkProduction(slug, expectedHash) {
  const reportUrl = `${production}/research/reports/${slug}`;
  const indexUrl = `${production}/research`;
  const deadline = Date.now() + 120_000;
  do {
    try {
      const get = url => fetch(url, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
      const [report, index] = await Promise.all([get(reportUrl), get(indexUrl)]);
      if (report.ok && index.ok) {
        const [bytes, html] = await Promise.all([report.arrayBuffer(), index.text()]);
        if (sha256(Buffer.from(bytes)) === expectedHash && html.includes(`href="/research/${slug}"`)) {
          return { reportUrl, indexUrl, reportHash: expectedHash };
        }
      }
    } catch (error) {
      if (!(error instanceof TypeError || error instanceof DOMException)) throw error;
    }
    await pause(5_000);
  } while (Date.now() < deadline);
  throw new Error(`Production report hash or archive listing could not be verified: ${reportUrl}`);
}

async function publishThroughGitHub({ slug, files, record, save }) {
  const branch = git("branch", "--show-current");
  if (!branch || branch === "main") throw new Error("Use a dedicated release branch");
  const remote = git("remote", "get-url", "origin");
  if (!/^(?:https:\/\/github\.com\/|git@github\.com:)sarsadsl\/research_report(?:\.git)?$/.test(remote)) {
    throw new Error("Origin must be sarsadsl/research_report");
  }
  git("fetch", "origin", "main");
  if (git("merge-base", "origin/main", "HEAD") !== git("rev-parse", "origin/main")) {
    throw new Error("Sync the release branch with origin/main before publishing");
  }
  const assertOnlyReleaseFiles = changed => {
    const outside = changed.split("\0").filter(file => file && !files.includes(file));
    if (outside.length) throw new Error(`Unrelated paths in release branch or index: ${outside.join(", ")}`);
  };
  // A previously committed public source index can accompany the report.
  const branchFiles = git("diff", "--name-only", "-z", "origin/main...HEAD")
    .split("\0").filter(file => file !== `research/${slug}/notes.md`).join("\0");
  assertOnlyReleaseFiles(branchFiles);
  assertOnlyReleaseFiles(git("diff", "--cached", "--name-only", "-z"));
  git("add", "--", ...files);
  if (git("diff", "--cached", "--name-only", "-z")) git("commit", "--only", "-m", `research: publish ${slug}`, "--", ...files);
  record.commit = git("rev-parse", "HEAD");
  if (record.commit === git("rev-parse", "origin/main")) throw new Error("No new release commit");
  await save();
  git("push", "-u", "origin", `HEAD:refs/heads/${branch}`);
  const prior = JSON.parse(gh("pr", "list", "--head", branch, "--base", "main", "--state", "open", "--json", "number,url"));
  record.pullRequest = prior[0]?.url ?? gh("pr", "create", "--base", "main", "--head", branch,
    "--title", `Publish ${slug} Full Report`, "--body", `Signed Full Report for ${slug}. The production workflow verifies the certificate and QC before importing into D1.`);
  await save();
  record.ci = await waitForWorkflow("research-quality-pr.yml", record.commit, "pull_request");
  gh("pr", "merge", record.pullRequest, "--merge", "--match-head-commit", record.commit);
  record.mergeCommit = JSON.parse(gh("pr", "view", record.pullRequest, "--json", "mergeCommit")).mergeCommit?.oid;
  if (!record.mergeCommit) throw new Error("GitHub did not confirm the merge commit");
  await save();
  record.deployment = await waitForWorkflow("deploy-cloudflare.yml", record.mergeCommit, "push");
  record.production = await checkProduction(slug, record.qc.reportHash);
}

async function main() {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: {
    publish: { type: "boolean" }, "evidence-dir": { type: "string" },
  } });
  const [slug] = positionals;
  if (positionals.length !== 1) throw new Error("Usage: npm run research:release -- <slug> [--evidence-dir DIR] [--publish]");
  assertSafeSlug(slug);
  const dir = `research/${slug}`;
  const releases = `.research-verification/${slug}/releases`;
  const auditDir = `${releases}/${randomUUID()}`;
  await mkdir(auditDir, { recursive: true });
  const record = { slug, status: "BLOCKED", reviews: [], repairs: [] };
  const save = () => writeFile(`${auditDir}/release.json`, JSON.stringify(record, null, 2) + "\n");
  const validationArgs = values["evidence-dir"] ? ["--evidence-dir", values["evidence-dir"]] : [];
  try {
    let requirePrimaryClearance = await hasUnclearedPrimaryFinding(releases);
    for (let round = 0; round <= 2; round++) {
      const attemptDir = `${auditDir}/attempt-${round}`;
      await mkdir(attemptDir);
      record.review = JSON.parse(command("python", ["-m", "verification.auto_review", slug,
        "--output", `${attemptDir}/agy-review.json`, ...validationArgs], { allowBlocked: true }));
      record.reviews.push(record.review);
      await save();
      const severities = record.review.findingSummary?.severityCounts ?? {};
      if (record.review.ok || severities.P0 > 0 || round === 2) break;
      if (!(severities.P1 > 0 || severities.P2 > 0 || record.review.deterministicStatus !== "PASS")) break;
      requirePrimaryClearance ||= record.review.reviewProvider === "agy-gemini" && severities.P1 > 0;
      const repair = await applyRepair(dir, auditDir, round + 1, slug);
      if (!repair) break;
      record.repairs.push(repair);
      await save();
    }
    const generated = JSON.parse(node("research-generate", [slug]));
    const qc = await runReportQc({ slug });
    const report = `public/research/reports/${slug}.html`;
    assertReleaseQc(qc, { reportHash: sha256(await readFile(report)), expectedPages: qc.expectedPages });
    record.qc = qc;
    if (record.review.ok !== true || !["PASS", "PASS_WITH_P2"].includes(record.review.status)) {
      const checks = record.review.deterministicIssues?.map(check => check.id).join(", ");
      const reason = record.review.blockedReasons?.join("; ") || "missing passing review";
      throw new Error(`Review blocked: ${reason}${checks ? ` [${checks}]` : ""}`);
    }
    if (requirePrimaryClearance && record.review.reviewProvider !== "agy-gemini") {
      throw new Error("Agy must verify the correction of its earlier P0 or P1 finding");
    }
    if (!values.publish) {
      record.status = "VERIFIED";
      return;
    }
    const { report: intended } = await readJson(`${dir}/research-package.json`);
    if (intended.status !== "published" || intended.visibility === "unlisted" || !intended.publishedAt) {
      throw new Error("Set the intended published status and publication date before requesting release");
    }
    const key = process.env.RESEARCH_VERIFICATION_PRIVATE_KEY_PATH;
    if (!key || !process.env.RESEARCH_VERIFICATION_PUBLIC_KEY) throw new Error("Trusted release key configuration is missing");
    const signed = JSON.parse(node("research-certificate", [
      "sign", "--root", ".", "--slug", slug, "--review", record.review.recordPath,
      "--private-key", key, ...validationArgs,
    ]));
    const verified = JSON.parse(node("research-certificate", ["verify", "--root", ".", "--slug", slug]));
    if (verified.ok !== true || verified.reportHash !== qc.reportHash) throw new Error("Certificate and QC hashes differ");
    record.certificate = verified;
    const files = [`${dir}/manifest.json`, `${dir}/research-package.json`, `${dir}/report-profiles.json`,
      `${dir}/verification-certificate.json`, report, ...generated.targets.map(file => file.replaceAll("\\", "/"))];
    if (signed.ok !== true) throw new Error("Signing did not confirm success");
    await save();
    await publishThroughGitHub({ slug, files, record, save });
    record.status = "DEPLOYED";
  } catch (error) {
    if (error.qc) record.qc = error.qc;
    record.reason = error.message;
    throw error;
  } finally {
    await save();
    console.log(`RESULT: ${record.status}\nRelease evidence: ${auditDir}/release.json`);
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });

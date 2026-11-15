import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { runVerifyCommand } from "./research-certificate.mjs";

const SHA_RE = /^[a-f0-9]{40}$/;

export function collectAffectedResearchSlugs(files, root = process.cwd()) {
  const slugs = new Set();
  for (const raw of files) {
    const file = String(raw).replaceAll("\\", "/");
    const packageMatch = file.match(/^research\/([a-z0-9]+(?:-[a-z0-9]+)*)\//);
    const reportMatch = file.match(/^public\/research\/reports\/([a-z0-9]+(?:-[a-z0-9]+)*)\.html$/);
    const slug = packageMatch?.[1] ?? reportMatch?.[1];
    if (slug && existsSync(path.join(root, "research", slug, "research-package.json"))) {
      slugs.add(slug);
    }
  }
  return [...slugs].sort();
}

export async function verifyChangedResearchCertificates({
  files,
  root = process.cwd(),
  env = process.env,
  verify = runVerifyCommand,
}) {
  const slugs = collectAffectedResearchSlugs(files, root);
  const results = [];
  for (const slug of slugs) {
    const result = await verify({ root, slug, env });
    if (result?.ok !== true || !["PASS", "PASS_WITH_P2"].includes(result.certificate?.payload?.status)) {
      throw new Error(`Research certificate verification did not pass for ${slug}`);
    }
    results.push({ slug, status: result.certificate.payload.status, keyId: result.summary?.keyId });
  }
  return results;
}

function runGit(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout: 30_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Unable to determine changed research files with git ${args.join(" ")}`);
  }
  return String(result.stdout ?? "");
}

async function resolveBaseSha(root, event, env) {
  const pullBase = event?.pull_request?.base?.sha;
  if (typeof pullBase === "string" && SHA_RE.test(pullBase)) return pullBase;
  const before = event?.before;
  if (typeof before === "string" && SHA_RE.test(before) && !/^0+$/.test(before)) return before;
  const mergeBase = runGit(["merge-base", "origin/main", "HEAD"], root).trim();
  if (!SHA_RE.test(mergeBase)) throw new Error("Unable to identify trusted base commit for certificate scope");
  return mergeBase;
}

export async function main({ root = process.cwd(), env = process.env } = {}) {
  const eventPath = env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error("GITHUB_EVENT_PATH is required; refusing to skip certificate checks");
  const event = JSON.parse(await readFile(eventPath, "utf8"));
  const baseSha = await resolveBaseSha(root, event, env);
  const changedText = runGit(["diff", "--name-only", "--no-renames", "-z", `${baseSha}...HEAD`], root);
  const files = changedText.split("\0").filter(Boolean);
  const slugs = collectAffectedResearchSlugs(files, root);
  if (slugs.length === 0) {
    console.log("No research package or report changes; no report certificate required.");
    return [];
  }
  const results = await verifyChangedResearchCertificates({ files, root, env });
  console.log(`Signed research certificates verified: ${results.map((item) => item.slug).join(", ")}`);
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

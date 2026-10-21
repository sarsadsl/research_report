import { access, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = process.cwd();
const researchRoot = resolve(root, "research");
const entries = await readdir(researchRoot, { withFileTypes: true });
const slugs = [];

for (const entry of entries) {
  if (!entry.isDirectory() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name)) continue;
  try {
    await Promise.all([
      access(join(researchRoot, entry.name, "manifest.json")),
      access(join(researchRoot, entry.name, "research-package.json")),
      access(join(researchRoot, entry.name, "report-profiles.json")),
    ]);
    slugs.push(entry.name);
  } catch {
    // Intake-only folders are intentionally not part of the build gate.
  }
}

if (!slugs.length) throw new Error("No complete research packages found");

for (const slug of slugs.sort()) {
  for (const args of [["scripts/research-validate.mjs", slug], ["scripts/research-generate.mjs", slug, "--check"]]) {
    const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit", windowsHide: true });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error("Research check failed for " + slug + ": " + args.join(" "));
  }
}

console.log("Research package check passed: " + slugs.join(", "));

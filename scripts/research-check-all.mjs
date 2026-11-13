import { access, readdir, readFile } from "node:fs/promises";
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

// Strict public HTML registration: a manually authored company dossier cannot be
// deployed as a substitute for the canonical generated Full Report.
const profileOutputs = new Map();
const fullOutputs = new Set();
for (const slug of slugs) {
  const profileFile = join(researchRoot, slug, "report-profiles.json");
  const profiles = JSON.parse(await readFile(profileFile, "utf8")).profiles ?? {};
  for (const [name, profile] of Object.entries(profiles)) {
    if (typeof profile.output !== "string") continue;
    const output = profile.output.replaceAll("\\", "/");
    if (profileOutputs.has(output)) throw new Error("Duplicate public report output: " + output);
    profileOutputs.set(output, { slug, name, profile });
    if (name === "full-research" && profile.kind === "generated" &&
        profile.layout === "research-standard-v2" &&
        output === "public/research/reports/" + slug + ".html") {
      fullOutputs.add(output);
    }
  }
}
const publicReportsRoot = join(root, "public", "research", "reports");
const publicEntries = await readdir(publicReportsRoot, { withFileTypes: true });
for (const entry of publicEntries) {
  if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
  const output = "public/research/reports/" + entry.name;
  if (!profileOutputs.has(output)) {
    throw new Error("Unregistered public report HTML: " + output + ". Author a canonical research package and generated profile, not standalone HTML.");
  }
  const canonicalCompany = entry.name.replace(/\.html$/, "");
  if (slugs.includes(canonicalCompany) && !fullOutputs.has(output)) {
    throw new Error("Company HTML is not Full Report generated output: " + output);
  }
}
// Archive index links must lead to approved full-research profiles; company
// discovery otherwise comes from D1 listPublishedCompanies(), not hardcoded cards.
const archivePage = await readFile(join(root, "app", "research", "page.tsx"), "utf8");
for (const match of archivePage.matchAll(/href=["'](\/research\/reports\/[^"'#?]+\.html)["']/g)) {
  const output = "public" + match[1];
  if (!fullOutputs.has(output)) throw new Error("Archive page links to non-Full-Report HTML: " + match[1]);
}


for (const slug of slugs.sort()) {
  for (const args of [["scripts/research-validate.mjs", slug], ["scripts/research-generate.mjs", slug, "--check"]]) {
    const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit", windowsHide: true });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error("Research check failed for " + slug + ": " + args.join(" "));
  }
}

console.log("Research package check passed: " + slugs.join(", "));

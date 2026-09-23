import { appendFile, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function isDocumentationOnly(files) {
  return files.length > 0 && files.every(file =>
    file === "README.md" || /^research_system\/[^/]+\.md$/.test(file) || /^docs\/.+\.md$/.test(file));
}

export function researchSlugs(files) {
  return [...new Set(files
    .map(file => file.match(/^research\/([a-z0-9]+(?:-[a-z0-9]+)*)\//)?.[1])
    .filter(Boolean))];
}

async function main() {
  let publish = true; // Unknown ranges and manual dispatches must not silently skip release checks.
  let slug = process.env.RESEARCH_SLUG || "vpec-2455";
  if (process.env.GITHUB_EVENT_NAME === "push") {
    const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
    if (/^[a-f0-9]{40}$/.test(event.before) && !/^0+$/.test(event.before) && /^[a-f0-9]{40}$/.test(event.after)) {
      const result = spawnSync("git", ["diff", "--name-only", "--no-renames", "-z", event.before, event.after], { encoding: "utf8" });
      if (result.status !== 0) throw new Error("Cannot determine changed paths; refusing to guess deployment scope");
      const files = result.stdout.split("\0").filter(Boolean);
      const slugs = researchSlugs(files);
      if (slugs.length > 1) throw new Error("One release may publish only one research slug: " + slugs.join(", "));
      if (slugs.length === 1) slug = slugs[0];
      publish = !isDocumentationOnly(files);
    }
  }
  if (!process.env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is required");
  await appendFile(process.env.GITHUB_OUTPUT, "publish=" + publish + "\nslug=" + slug + "\n");
  console.log(publish ? "Release validation required for " + slug : "Documentation-only: no remote import or deployment");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}

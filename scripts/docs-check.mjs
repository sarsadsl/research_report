import { readFile, readdir, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

async function markdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(error => {
    if (error.code === "ENOENT") return [];
    throw error;
  })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(file));
    else if (entry.isFile() && file.endsWith(".md")) files.push(file);
  }
  return files;
}

const scripts = JSON.parse(await readFile("package.json", "utf8")).scripts;
const docs = ["README.md", ...await markdownFiles("research_system"), ...await markdownFiles("docs")];
const errors = [];
for (const file of docs) {
  const text = await readFile(file, "utf8");
  if ((text.match(/^```/gm) ?? []).length % 2) errors.push(`${file}: unbalanced code fence`);
  for (const [, command] of text.matchAll(/npm(?:\.cmd)? run ([\w:-]+)/g)) {
    if (!Object.hasOwn(scripts, command)) errors.push(`${file}: unknown script ${command}`);
  }
  for (const [, link] of text.matchAll(/(?<!!)\[[^\]]+\]\(([^)]+)\)/g)) {
    if (/^(?:[a-z]+:|#)/i.test(link)) continue;
    const path = link.split("#")[0];
    if (path) await access(resolve(dirname(file), decodeURIComponent(path))).catch(() => errors.push(`${file}: broken link ${link}`));
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else console.log(`Documentation checks: PASS (${docs.length} files)`);

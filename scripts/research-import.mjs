import { spawnSync } from "node:child_process";
import path from "node:path";
import { assertSafeSlug, assertValid, validateSlug } from "./research-lib.mjs";

const slug = process.argv[2];
if (!slug) throw new Error("Usage: npm run research:import -- <slug> [--local|--remote]");
assertSafeSlug(slug);
const remote = process.argv.includes("--remote");
const local = process.argv.includes("--local");
if (remote && local) throw new Error("Choose only one of --local or --remote");
const mode = remote ? "--remote" : "--local";
const { researchPackage: pkg, result } = await validateSlug(slug);
assertValid(result);

const generation = spawnSync(process.execPath, ["scripts/research-generate.mjs", slug, "--check"], { stdio: "inherit" });
if (generation.status !== 0) process.exit(generation.status ?? 1);

const database = process.env.RESEARCH_D1_DATABASE || "research-report-db";
const sqlFile = path.join("db", "seed", `${pkg.company.ticker}.sql`);
const wrangler = path.join("node_modules", "wrangler", "bin", "wrangler.js");
console.log(`Importing ${pkg.company.name} ${pkg.company.ticker} into ${database} (${mode.slice(2)})`);
const execution = spawnSync(process.execPath, [wrangler, "d1", "execute", database, mode, `--file=${sqlFile}`], { stdio: "inherit" });
process.exit(execution.status ?? 1);


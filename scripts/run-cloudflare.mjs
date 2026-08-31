import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const mode = process.argv[2];
if (mode !== "preview" && mode !== "deploy") {
  console.error("Usage: node scripts/run-cloudflare.mjs <preview|deploy> [wrangler args]");
  process.exit(1);
}

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
if (mode === "deploy") {
  // Preserve the old entrypoint, but do not allow it to bypass release QC.
  const { parsePublishArgs } = await import("./research-publish-lib.mjs");
  const { publishResearch } = await import("./research-publish.mjs");
  await publishResearch(parsePublishArgs(["vpec-2455", "--remote", ...process.argv.slice(3)]), projectRoot);
  process.exit(0);
}
const openNextCli = path.join(
  projectRoot,
  "node_modules",
  "@opennextjs",
  "cloudflare",
  "dist",
  "cli",
  "index.js",
);
const wranglerCli = path.join(projectRoot, "node_modules", "wrangler", "bin", "wrangler.js");

function runNode(script, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: projectRoot,
      env: { ...process.env, ...extraEnv },
      shell: false,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Command terminated by ${signal}`));
        return;
      }
      resolve(code ?? 1);
    });
  });
}

const buildExitCode = await runNode(openNextCli, ["build"]);
if (buildExitCode !== 0) process.exit(buildExitCode);

const wranglerCommand = mode === "deploy" ? "deploy" : "dev";
const wranglerEnv = mode === "deploy" ? { OPEN_NEXT_DEPLOY: "true" } : {};
const wranglerExitCode = await runNode(
  wranglerCli,
  [wranglerCommand, ...process.argv.slice(3)],
  wranglerEnv,
);

process.exit(wranglerExitCode);

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertUnchanged, executeRelease, parsePublishArgs } from "./research-publish-lib.mjs";
import { expectedReportPages, hashFiles, parseDeployment, treeFiles } from "./research-publish.mjs";
import { isDocumentationOnly } from "./ci-scope.mjs";

const candidate = { reportHash: "report-sha", expectedPages: 14, buildHash: "build-sha" };
const qcResult = () => ({
  websiteParity: true, reportHash: "report-sha",
  results: ["desktop", "laptop", "mobile"].map(name => ({
    name, version: "p1.6-layout-qc", pages: 14, dots: 14, profile: "full-research",
    fallbacks: 0, overflows: [], overlaps: [], clippings: [], horizontalOverflow: 0,
    viewport: name === "desktop" ? {width:1440,height:1000} : name === "laptop" ? {width:1024,height:768} : {width:390,height:844}, runtimeErrors: [],
  })),
});

test("publisher distinguishes canonical source pages from rendered page target", () => {
  const baseline = '<section class="page"></section>'.repeat(8);
  assert.equal(expectedReportPages(baseline,{sourcePages:8,expectedPages:14}),14);
  assert.equal(expectedReportPages(baseline,{}),8);
});

function harness(overrides = {}) {
  const effects = [], snapshots = [];
  const record = { status: "RUNNING", stages: {} };
  const actions = {
    save: async value => snapshots.push(structuredClone(value)),
    validate: async () => "source-sha",
    sourceHash: async () => "source-sha",
    build: async () => effects.push("build"),
    candidate: async () => structuredClone(candidate),
    qc: async () => qcResult(),
    verify: async () => {},
    archive: async () => effects.push("archive"),
    import: async () => { effects.push("remote-import"); return { runId: "run-1" }; },
    deploy: async () => { effects.push("remote-deploy"); return { status: "SUCCESS", versionId: "version-1" }; },
    ...overrides,
  };
  return { record, effects, snapshots, actions };
}

test("publish defaults to validation only and accepts any safe research slug", () => {
  assert.equal(parsePublishArgs(["vpec-2455"]).remote, false);
  assert.equal(parsePublishArgs(["vpec-2455", "--dry-run"]).remote, false);
  assert.equal(parsePublishArgs(["vpec-2455", "--remote"]).remote, true);
  assert.equal(parsePublishArgs(["other-company"]).slug,"other-company");
  for (const args of [[], ["../x"], ["vpec-2455", "--remote", "--dry-run"], ["vpec-2455", "--skip-qc"]]) {
    assert.throws(() => parsePublishArgs(args));
  }
});

test("dry-run completes QC and archives evidence without any external effect", async () => {
  const h = harness();
  const record = await executeRelease({ remote: false }, h.actions, h.record);
  assert.equal(record.status, "VALIDATED_NOT_DEPLOYED");
  assert.deepEqual(h.effects, ["build", "archive"]);
  assert.equal(record.stages.qc.status, "PASS");
  assert.equal(record.import, undefined);
});

test("successful release imports and deploys only after QC and archiving", async () => {
  const h = harness();
  const record = await executeRelease({ remote: true }, h.actions, h.record);
  assert.deepEqual(h.effects, ["build", "archive", "remote-import", "remote-deploy"]);
  assert.equal(record.status, "DEPLOYED");
  assert.equal(record.import.runId, "run-1");
  assert.equal(record.deployment.versionId, "version-1");
  assert.ok(h.snapshots.some(snapshot => snapshot.stages.import?.status === "RUNNING" && snapshot.stages.qc.status === "PASS"));
});

test("every pre-release failure prevents both D1 and deployment and saves failure evidence", async t => {
  for (const action of ["validate", "build", "candidate", "qc", "archive", "verify"]) {
    await t.test(action, async () => {
      const h = harness({ [action]: async () => { throw new Error("deliberate failure"); } });
      await assert.rejects(executeRelease({ remote: true }, h.actions, h.record), /deliberate failure/);
      assert.equal(h.effects.includes("remote-import"), false);
      assert.equal(h.effects.includes("remote-deploy"), false);
      assert.equal(h.snapshots.at(-1).status, "FAILED");
      assert.ok(h.record.failedStage);
    });
  }
});

test("missing/failed/mismatched QC never becomes a passing release", async t => {
  const corruptions = {
    overflow: qc => qc.results[0].overflows.push({ page: 3, pixels: 10 }),
    missingArray: qc => delete qc.results[0].overlaps,
    missingHorizontal: qc => delete qc.results[0].horizontalOverflow,
    missingMobile: qc => qc.results.pop(),
    duplicateViewport: qc => qc.results[1].name = "desktop",
    staleReport: qc => qc.reportHash = "old-report",
    parityFailure: qc => qc.websiteParity = false,
    wrongViewport: qc => qc.results[1].viewport.width = 500,
    runtimeError: qc => qc.results[1].runtimeErrors.push("uncaught error"),
  };
  for (const [name, corrupt] of Object.entries(corruptions)) {
    await t.test(name, async () => {
      const h = harness({ qc: async () => { const qc = qcResult(); corrupt(qc); return qc; } });
      await assert.rejects(executeRelease({ remote: true }, h.actions, h.record));
      assert.deepEqual(h.effects, ["build"]);
      assert.equal(h.record.failedStage, "qc");
      assert.ok(h.record.qc, "failed QC diagnostics must be retained");
    });
  }
});

test("source changes during build block the release before QC/import", async () => {
  const h = harness({ sourceHash: async () => "changed-source" });
  await assert.rejects(executeRelease({ remote: true }, h.actions, h.record), /changed/);
  assert.deepEqual(h.effects, ["build"]);
});

test("drift immediately before import is blocked", async () => {
  let checks = 0;
  const h = harness({ verify: async () => { if (++checks === 2) throw new Error("changed before import"); } });
  await assert.rejects(executeRelease({ remote: true }, h.actions, h.record), /changed before import/);
  assert.equal(h.effects.includes("remote-import"), false);
});

test("import failure or post-import drift blocks deployment without pretending to roll D1 back", async t => {
  await t.test("import failure", async () => {
    const h = harness({ import: async () => { throw new Error("verification failed"); } });
    await assert.rejects(executeRelease({ remote: true }, h.actions, h.record), /verification failed/);
    assert.equal(h.effects.includes("remote-deploy"), false);
    assert.equal(h.record.stages.import.status, "FAIL");
  });
  await t.test("drift after import", async () => {
    let checks = 0;
    const h = harness({ verify: async () => { if (++checks === 3) throw new Error("changed after import"); } });
    await assert.rejects(executeRelease({ remote: true }, h.actions, h.record), /changed after import/);
    assert.equal(h.record.stages.import.status, "PASS");
    assert.equal(h.effects.includes("remote-deploy"), false);
    assert.match(h.record.error, /not rolled back/);
  });
});

test("deployment failure retains verified import and QC evidence", async () => {
  const h = harness({ deploy: async () => { throw new Error("deploy failed"); } });
  await assert.rejects(executeRelease({ remote: true }, h.actions, h.record));
  assert.equal(h.record.stages.import.status, "PASS");
  assert.equal(h.record.qc.reportHash, "report-sha");
  assert.equal(h.record.status, "FAILED");
});

test("built artifact digest detects modified, added and removed files", async t => {
  const root = await mkdtemp(join(tmpdir(), "research-release-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "build"));
  const file = join(root, "build", "worker.js");
  await writeFile(file, "accepted");
  const digest = () => treeFiles(root, "build").then(files => hashFiles(root, files));
  const accepted = await digest();
  await writeFile(file, "changed");
  assert.throws(() => assertUnchanged(accepted, "other"), /changed/);
  assert.notEqual(await digest(), accepted);
  await writeFile(file, "accepted");
  await writeFile(join(root, "build", "extra.js"), "extra");
  assert.notEqual(await digest(), accepted);
  await rm(file);
  assert.notEqual(await digest(), accepted);
});

test("deployment metadata includes the actual version ID and public URL", () => {
  assert.deepEqual(parseDeployment("https://research-report.example.workers.dev\nCurrent Version ID: 8bd92a8e-4064-4138-93e4-7cd7f25d7544"), {
    status: "SUCCESS", versionId: "8bd92a8e-4064-4138-93e4-7cd7f25d7544", urls: ["https://research-report.example.workers.dev"],
  });
});

test("only an explicit documentation allowlist skips publishing", () => {
  assert.equal(isDocumentationOnly(["README.md", "research_system/RESEARCH_QC.md", "docs/guide.md"]), true);
  for (const files of [[], ["README.md", "app/page.tsx"], ["research/x/notes.md"], ["research_system/schemas/a.json"], ["public/README.md"], [".github/workflows/deploy-cloudflare.yml"]]) {
    assert.equal(isDocumentationOnly(files), false);
  }
});

test("CI scope uses the whole push range and catches renames out of runtime paths", async t => {
  const root = await mkdtemp(join(tmpdir(), "research-scope-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = args => {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git(["init"]);
  await mkdir(join(root, "public"));
  await writeFile(join(root, "public", "note.md"), "visible content\n");
  git(["add", "."]);
  const commit = () => git(["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-m", "fixture"]);
  commit();
  const before = git(["rev-parse", "HEAD"]);
  git(["mv", "public/note.md", "README.md"]);
  commit();
  const event = join(root, "event.json"), output = join(root, "output.txt");
  await writeFile(event, JSON.stringify({ before, after: git(["rev-parse", "HEAD"]) }));
  const script = fileURLToPath(new URL("./ci-scope.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8", env: { ...process.env, GITHUB_EVENT_NAME: "push", GITHUB_EVENT_PATH: event, GITHUB_OUTPUT: output } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(output, "utf8"), "publish=true\n");
});

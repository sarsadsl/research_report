import { assertQcResult } from "./report-qc.mjs";
import { assertSafeSlug } from "./research-lib.mjs";

export function parsePublishArgs(args) {
  const [slug, ...flags] = args;
  assertSafeSlug(slug ?? "");
  if (flags.some(flag => !["--dry-run", "--remote"].includes(flag))) throw new Error("Unknown publish option");
  if (flags.includes("--dry-run") && flags.includes("--remote")) throw new Error("Choose --dry-run or --remote");
  return { slug, remote: flags.includes("--remote") };
}

export function assertReleaseQc(qc, candidate) {
  if (!qc || qc.websiteParity !== true || qc.reportHash !== candidate.reportHash) throw new Error("QC artifact does not match release candidate");
  if (!Array.isArray(qc.results) || qc.results.length !== 3) throw new Error("Desktop, laptop and mobile QC viewports are required");
  for (const name of ["desktop", "laptop", "mobile"]) {
    const matches = qc.results.filter(result => result.name === name);
    if (matches.length !== 1) throw new Error(`Missing or duplicate ${name} QC`);
    assertQcResult(matches[0], { expectedPages: candidate.expectedPages, profile: "full-research" });
    const expected = name === "desktop" ? {width:1440,height:1000} : name === "laptop" ? {width:1024,height:768} : {width:390,height:844};
    if (matches[0].viewport?.width !== expected.width || matches[0].viewport?.height !== expected.height) throw new Error(`Wrong ${name} viewport`);
    if (!Array.isArray(matches[0].runtimeErrors) || matches[0].runtimeErrors.length) throw new Error(`Missing or failed ${name} runtime diagnostics`);
  }
}

export function assertUnchanged(expected, current) {
  if (expected !== current) throw new Error("Release inputs or built artifacts changed after validation; rerun publish");
}

// Every external effect is behind the same ordered gate in CI and local CLI.
// Adapters isolate process/network I/O so failure tests never touch real D1.
export async function executeRelease(options, actions, record) {
  let stage;
  const step = async (name, action) => {
    stage = name;
    record.stages[name] = { status: "RUNNING", startedAt: new Date().toISOString() };
    await actions.save(record); // Persist intent BEFORE attempting an external effect.
    const result = await action();
    record.stages[name].status = "PASS";
    record.stages[name].finishedAt = new Date().toISOString();
    await actions.save(record);
    return result;
  };
  try {
    const sourceHash = await step("validate", () => actions.validate());
    record.inputHash = sourceHash;
    await step("build", () => actions.build());
    record.candidate = await step("candidate", async () => {
      assertUnchanged(sourceHash, await actions.sourceHash());
      return actions.candidate();
    });
    record.qc = await step("qc", async () => {
      record.qc = await actions.qc();
      assertReleaseQc(record.qc, record.candidate);
      return record.qc;
    });
    await step("seal", async () => {
      await actions.verify(record.candidate, sourceHash);
      await actions.archive(record);
    });
    if (!options.remote) {
      record.status = "VALIDATED_NOT_DEPLOYED";
    } else {
      record.import = await step("import", async () => {
        await actions.verify(record.candidate, sourceHash);
        return actions.import(record.candidate);
      });
      record.deployment = await step("deploy", async () => {
        await actions.verify(record.candidate, sourceHash);
        return actions.deploy(); // Built artifact only: never rebuild after QC.
      });
      record.status = "DEPLOYED";
    }
    record.finishedAt = new Date().toISOString();
    await actions.save(record);
    return record;
  } catch (error) {
    if (error.qc) record.qc = error.qc;
    record.status = "FAILED";
    record.failedStage = stage;
    if (record.stages[stage]) record.stages[stage].status = "FAIL";
    record.finishedAt = new Date().toISOString();
    // Process output remains in the console, not in potentially public artifacts.
    record.error = `Release stopped at ${stage}; inspect command logs. External effects are not rolled back.`;
    await actions.save(record);
    throw error;
  }
}

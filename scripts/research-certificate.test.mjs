import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { canonicalJson, sha256 } from "./research-lib.mjs";
import {
  CERTIFICATE_FILENAME,
  PUBLIC_KEY_ENV_VAR,
  PYTHON_ENV_VAR,
  buildValidatorEnv,
  parseCertificateArgs,
  resolvePythonCommand,
  runCertificateCli,
  runKeygenCommand,
  runSignCommand,
  runVerifyCommand,
  sha256Bytes,
} from "./research-certificate.mjs";

const SLUG = "acme-2300";

function makeHex(seed) {
  return sha256(String(seed));
}

function captureIo() {
  let out = "";
  let err = "";
  return {
    stdout: { write: (chunk) => { out += String(chunk); } },
    stderr: { write: (chunk) => { err += String(chunk); } },
    getStdout: () => out,
    getStderr: () => err,
  };
}

async function createTempFixture(t) {
  const baseDir = await mkdtemp(path.join(tmpdir(), "research-cert-test-"));
  t.after(() => rm(baseDir, { recursive: true, force: true }));

  const repoRoot = path.join(baseDir, "repo");
  const keysDir = path.join(baseDir, "keys");
  const outsideDir = path.join(baseDir, "outside");
  await mkdir(path.join(repoRoot, "research", SLUG), { recursive: true });
  await mkdir(path.join(repoRoot, "public", "research", "reports"), { recursive: true });
  await mkdir(path.join(repoRoot, ".research-verification", SLUG), { recursive: true });
  await mkdir(keysDir, { recursive: true });
  await mkdir(outsideDir, { recursive: true });

  const manifest = {
    schemaVersion: "1.0.0",
    slug: SLUG,
    ticker: "2300",
    market: "TWSE",
    reportVersion: "v1.0",
  };
  const pkg = {
    schemaVersion: "1.0.0",
    packageVersion: "1.0.0",
    asOfDate: "2026-11-14",
    company: { slug: SLUG, ticker: "2300", market: "TWSE", name: "Acme Corp" },
    report: { slug: SLUG, version: "v1.0", status: "published" },
    sources: [
      { id: "src-mops-1", evidenceClass: "official", provider: "MOPS", title: "Q3 Financial Report" },
    ],
  };
  const profilesDoc = {
    schemaVersion: "1.0.0",
    profiles: {
      "full-research": {
        kind: "generated",
        output: `public/research/reports/${SLUG}.html`,
        layout: "research-standard-v2",
        expectedPages: 14,
      },
    },
  };
  const reportHtml = "<!doctype html><html><body><section class='page'>Acme Report</section></body></html>\n";

  const manifestPath = path.join(repoRoot, "research", SLUG, "manifest.json");
  const pkgPath = path.join(repoRoot, "research", SLUG, "research-package.json");
  const profilesPath = path.join(repoRoot, "research", SLUG, "report-profiles.json");
  const reportPath = path.join(repoRoot, "public", "research", "reports", `${SLUG}.html`);

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  await writeFile(profilesPath, JSON.stringify(profilesDoc, null, 2) + "\n", "utf8");
  await writeFile(reportPath, reportHtml, "utf8");

  const computeValidatorOutput = async (overrides = {}) => {
    const curManifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const curPkg = JSON.parse(await readFile(pkgPath, "utf8"));
    const curProfilesBytes = await readFile(profilesPath);
    const hashes = {
      packageHash: sha256(curPkg),
      manifestHash: sha256(curManifest),
      profileHash: sha256Bytes(curProfilesBytes),
      evidenceHash: makeHex("evidence-v1"),
      recomputeHash: makeHex("recompute-v1"),
      policyHash: makeHex("policy-v1"),
      verifierCodeHash: makeHex("verifier-code-v1"),
      checksHash: makeHex("checks-v1"),
      ...(overrides.hashes ?? {}),
    };
    const status = overrides.status ?? "PASS";
    const counts = {
      total: 1,
      PASS: status === "PASS" ? 1 : 0,
      BLOCKED: status === "BLOCKED" ? 1 : 0,
      NOT_VERIFIED: status === "NOT_VERIFIED" ? 1 : 0,
    };
    return {
      exitCode: status === "PASS" ? 0 : status === "NOT_VERIFIED" ? 1 : 2,
      result: {
        schemaVersion: "1.0.0",
        slug: overrides.slug ?? SLUG,
        status,
        ok: status === "PASS",
        counts,
        blockedIds: status === "BLOCKED" ? ["synthetic.blocked"] : [],
        checks: status === "PASS" ? [] : [
          { id: "synthetic.status", category: status === "BLOCKED" ? "schema" : "source_evidence", status },
        ],
        policyVersion: overrides.policyVersion ?? "1.0.0",
        packageVersion: overrides.packageVersion ?? curPkg.packageVersion,
        reportVersion: overrides.reportVersion ?? curPkg.report.version,
        asOfDate: overrides.asOfDate ?? curPkg.asOfDate,
        ...hashes,
        hashes,
      },
    };
  };

  let validatorState = await computeValidatorOutput();
  const validatorRunner = async () => structuredClone(validatorState);

  const buildReviewRecord = (overrides = {}) => {
    const h = validatorState.result.hashes;
    return {
      schemaVersion: "1.0.0",
      policyVersion: "1.0.0",
      slug: SLUG,
      status: "PASS",
      ok: true,
      deterministicStatus: "PASS",
      model: "gemini-4-argon-low",
      agyVersion: "agy 1.2.3",
      agyMetadata: {
        model: "gemini-4-argon-low",
        agyVersion: "agy 1.2.3",
        executable: "agy",
      },
      modelInvoked: true,
      startedAtUtc: "2026-11-14T10:00:00Z",
      completedAtUtc: "2026-11-14T10:01:00Z",
      ...h,
      hashes: { ...h },
      promptSha256: makeHex("prompt-1"),
      responseSha256: makeHex("response-1"),
      findingSummary: {
        totalBatches: 1,
        totalFindings: 0,
        severityCounts: { P0: 0, P1: 0, P2: 0, P3: 0 },
        p3Count: 0,
      },
      blockedReasons: [],
      restrictedSourceIds: [],
      unavailableSourceIds: [],
      sourceEvidenceSummary: [
        { sourceId: "src-mops-1", available: true, hasExcerpt: true },
      ],
      findings: [],
      p3Notes: [{ note: "minor wording suggestion" }],
      batches: [
        {
          batchId: "batch-1",
          prompt: "SENSITIVE_PROMPT_TEXT_DO_NOT_LEAK",
          rawStdout: "SENSITIVE_RAW_STDOUT_DO_NOT_LEAK",
          excerpt: "SENSITIVE_EXCERPT_DO_NOT_LEAK",
        },
      ],
      ...overrides,
    };
  };

  const reviewPath = path.join(repoRoot, ".research-verification", SLUG, "gemini-review.json");
  await writeFile(reviewPath, JSON.stringify(buildReviewRecord(), null, 2) + "\n", "utf8");

  const privateKeyPath = path.join(keysDir, "ed25519-private.pem");
  const publicKeyPath = path.join(keysDir, "ed25519-public.pem");
  const keygenIo = captureIo();
  const { publicKeyPem, keyId } = await runKeygenCommand({
    privateKeyPath,
    stdout: keygenIo.stdout,
  });
  await writeFile(publicKeyPath, publicKeyPem, "utf8");

  return {
    baseDir,
    repoRoot,
    keysDir,
    outsideDir,
    manifestPath,
    pkgPath,
    profilesPath,
    reportPath,
    reviewPath,
    privateKeyPath,
    publicKeyPath,
    publicKeyPem,
    keyId,
    validatorRunner,
    setValidatorState: (next) => { validatorState = next; },
    computeValidatorOutput,
    buildReviewRecord,
  };
}

test("resolvePythonCommand uses RESEARCH_VERIFICATION_PYTHON or platform default", () => {
  assert.deepEqual(
    resolvePythonCommand({ [PYTHON_ENV_VAR]: "/opt/custom/python" }, "win32"),
    { command: "/opt/custom/python", prefixArgs: [] },
  );
  assert.deepEqual(
    resolvePythonCommand({}, "win32"),
    { command: "py", prefixArgs: ["-3"] },
  );
  assert.deepEqual(
    resolvePythonCommand({}, "linux"),
    { command: "python3", prefixArgs: [] },
  );
});

test("validator subprocess receives only its environment allowlist", () => {
  const env = buildValidatorEnv({
    PATH: "trusted-path",
    PYTHONPATH: "untrusted-module-path",
    RESEARCH_VERIFICATION_PYTHON: "python3",
    GITHUB_TOKEN: "never-forward",
    CLOUDFLARE_API_TOKEN: "never-forward",
    AWS_SECRET_ACCESS_KEY: "never-forward",
    RESEARCH_VERIFICATION_PUBLIC_KEY: "not-needed-by-validator",
  });
  assert.deepEqual(env, {
    PATH: "trusted-path",
    RESEARCH_VERIFICATION_PYTHON: "python3",
  });
});

test("keygen creates Ed25519 keypair, prints only public PEM, and refuses overwrite", async (t) => {
  const fx = await createTempFixture(t);
  const newPrivPath = path.join(fx.keysDir, "second-private.pem");
  const io = captureIo();
  const res = await runKeygenCommand({ privateKeyPath: newPrivPath, stdout: io.stdout });

  assert.match(io.getStdout(), /^-----BEGIN PUBLIC KEY-----/);
  assert.equal(io.getStdout().includes("PRIVATE KEY"), false);
  assert.equal(res.publicKeyPem, io.getStdout());

  const savedPriv = await readFile(newPrivPath, "utf8");
  assert.match(savedPriv, /^-----BEGIN PRIVATE KEY-----/);

  await assert.rejects(
    runKeygenCommand({ privateKeyPath: newPrivPath, stdout: io.stdout }),
    /overwrite/i,
  );

  await assert.rejects(
    runKeygenCommand({ privateKeyPath: path.join(process.cwd(), ".research-verification-test-private.pem"), stdout: io.stdout }),
    /inside the current project/i,
  );
});

test("CLI rejects inline PEM material in arguments", () => {
  assert.throws(
    () => parseCertificateArgs(["keygen", "--private-key", "-----BEGIN PRIVATE KEY-----\nAAA"]),
    /raw key material/i,
  );
  assert.throws(
    () => parseCertificateArgs(["verify", "--root", ".", "--slug", SLUG, "--public-key", "-----BEGIN PUBLIC KEY-----"]),
    /raw key material/i,
  );
});

test("sign and verify happy path with PASS and no raw sensitive review fields in certificate", async (t) => {
  const fx = await createTempFixture(t);
  const signIo = captureIo();
  const signCode = await runCertificateCli(
    [
      "sign",
      "--root",
      fx.repoRoot,
      "--slug",
      SLUG,
      "--review",
      ".research-verification/acme-2300/gemini-review.json",
      "--private-key",
      fx.privateKeyPath,
    ],
    { stdout: signIo.stdout, stderr: signIo.stderr, validatorRunner: fx.validatorRunner },
  );
  assert.equal(signCode, 0, signIo.getStderr());

  const certPath = path.join(fx.repoRoot, "research", SLUG, CERTIFICATE_FILENAME);
  const certRaw = await readFile(certPath, "utf8");
  const certDoc = JSON.parse(certRaw);

  assert.equal(certDoc.schemaVersion, "1.0.0");
  assert.equal(certDoc.algorithm, "Ed25519");
  assert.equal(certDoc.payload.slug, SLUG);
  assert.equal(certDoc.payload.status, "PASS");
  assert.equal(certDoc.payload.model, "gemini-4-argon-low");
  assert.equal(certDoc.payload.modelInvoked, true);
  assert.equal(certDoc.payload.reviewRecordHash, sha256Bytes(await readFile(fx.reviewPath)));

  // Ensure no raw sensitive fields or text leaked into certificate
  for (const forbidden of [
    "SENSITIVE_PROMPT_TEXT_DO_NOT_LEAK",
    "SENSITIVE_RAW_STDOUT_DO_NOT_LEAK",
    "SENSITIVE_EXCERPT_DO_NOT_LEAK",
    "batches",
    "findings",
    "p3Notes",
    "sourceEvidence",
    "sourceEvidenceSummary",
    "rawStdout",
    "excerpt",
  ]) {
    assert.equal(certRaw.includes(forbidden), false, `Certificate must not contain ${forbidden}`);
  }

  // Verify via --public-key file
  const verifyIo = captureIo();
  const verifyCode = await runCertificateCli(
    ["verify", "--root", fx.repoRoot, "--slug", SLUG, "--public-key", fx.publicKeyPath],
    { stdout: verifyIo.stdout, stderr: verifyIo.stderr, validatorRunner: fx.validatorRunner },
  );
  assert.equal(verifyCode, 0, verifyIo.getStderr());

  // Verify via RESEARCH_VERIFICATION_PUBLIC_KEY env var
  const envIo = captureIo();
  const envVerifyCode = await runCertificateCli(
    ["verify", "--root", fx.repoRoot, "--slug", SLUG],
    {
      stdout: envIo.stdout,
      stderr: envIo.stderr,
      env: { [PUBLIC_KEY_ENV_VAR]: fx.publicKeyPem },
      validatorRunner: fx.validatorRunner,
    },
  );
  assert.equal(envVerifyCode, 0, envIo.getStderr());
});

test("PASS_WITH_P2 is permitted when P2 >= 1 and P0/P1 are 0", async (t) => {
  const fx = await createTempFixture(t);
  const p2Review = fx.buildReviewRecord({
    status: "PASS_WITH_P2",
    model: "gemini-4-argon-high",
    agyMetadata: { model: "gemini-4-argon-high", agyVersion: "agy 1.2.3" },
    findingSummary: {
      totalBatches: 1,
      totalFindings: 1,
      severityCounts: { P0: 0, P1: 0, P2: 1, P3: 2 },
      p3Count: 2,
    },
    findings: [{ severity: "P2", disclosureVerified: true, message: "Minor disclosure note" }],
  });
  await writeFile(fx.reviewPath, JSON.stringify(p2Review, null, 2) + "\n", "utf8");

  const { certificate } = await runSignCommand({
    root: fx.repoRoot,
    slug: SLUG,
    review: fx.reviewPath,
    privateKey: fx.privateKeyPath,
    validatorRunner: fx.validatorRunner,
    stdout: captureIo().stdout,
  });
  assert.equal(certificate.payload.status, "PASS_WITH_P2");
  assert.deepEqual(certificate.payload.findingCounts, { P0: 0, P1: 0, P2: 1, P3: 2 });

  const verifyRes = await runVerifyCommand({
    root: fx.repoRoot,
    slug: SLUG,
    publicKey: fx.publicKeyPath,
    validatorRunner: fx.validatorRunner,
    stdout: captureIo().stdout,
  });
  assert.equal(verifyRes.ok, true);
});

test("sign rejects invalid review status, modelInvoked=false, disallowed model, missing Agy version, or hash mismatch", async (t) => {
  const fx = await createTempFixture(t);

  const badCases = [
    { name: "status BLOCKED", patch: { status: "BLOCKED", ok: false } },
    { name: "status NOT_VERIFIED", patch: { status: "NOT_VERIFIED", ok: false } },
    { name: "deterministicStatus BLOCKED", patch: { deterministicStatus: "BLOCKED" } },
    { name: "modelInvoked false", patch: { modelInvoked: false } },
    { name: "disallowed model", patch: { model: "gemini-2.5-pro", agyMetadata: { model: "gemini-2.5-pro", agyVersion: "1.0" } } },
    { name: "missing agyVersion", patch: { agyVersion: "", agyMetadata: { model: "gemini-4-argon-low", agyVersion: "" } } },
    { name: "mismatched evidenceHash", patch: { evidenceHash: makeHex("wrong"), hashes: { ...(await fx.validatorRunner()).result.hashes, evidenceHash: makeHex("wrong") } } },
  ];

  for (const tc of badCases) {
    await t.test(tc.name, async () => {
      await writeFile(fx.reviewPath, JSON.stringify(fx.buildReviewRecord(tc.patch), null, 2), "utf8");
      await assert.rejects(
        runSignCommand({
          root: fx.repoRoot,
          slug: SLUG,
          review: fx.reviewPath,
          privateKey: fx.privateKeyPath,
          validatorRunner: fx.validatorRunner,
          stdout: captureIo().stdout,
        }),
      );
    });
  }

  await t.test("validator current status NOT_VERIFIED blocks signing", async () => {
    await writeFile(fx.reviewPath, JSON.stringify(fx.buildReviewRecord(), null, 2), "utf8");
    fx.setValidatorState(await fx.computeValidatorOutput({ status: "NOT_VERIFIED" }));
    await assert.rejects(
      runSignCommand({
        root: fx.repoRoot,
        slug: SLUG,
        review: fx.reviewPath,
        privateKey: fx.privateKeyPath,
        validatorRunner: fx.validatorRunner,
        stdout: captureIo().stdout,
      }),
      /must be PASS/i,
    );
    fx.setValidatorState(await fx.computeValidatorOutput());
  });

  await t.test("P2 without a verified disclosure location cannot be signed", async () => {
    const review = fx.buildReviewRecord({
      status: "PASS_WITH_P2",
      findingSummary: {
        totalBatches: 1,
        totalFindings: 1,
        severityCounts: { P0: 0, P1: 0, P2: 1, P3: 0 },
        p3Count: 0,
      },
      findings: [{ severity: "P2", disclosureVerified: false }],
    });
    await writeFile(fx.reviewPath, JSON.stringify(review, null, 2), "utf8");
    await assert.rejects(
      runSignCommand({
        root: fx.repoRoot,
        slug: SLUG,
        review: fx.reviewPath,
        privateKey: fx.privateKeyPath,
        validatorRunner: fx.validatorRunner,
        stdout: captureIo().stdout,
      }),
      /disclosure location/i,
    );
  });
});

test("verify rejects missing public key, tampered signature/payload, wrong slug, non-PASS validator, and stale hashes", async (t) => {
  const fx = await createTempFixture(t);
  await runSignCommand({
    root: fx.repoRoot,
    slug: SLUG,
    review: fx.reviewPath,
    privateKey: fx.privateKeyPath,
    validatorRunner: fx.validatorRunner,
    stdout: captureIo().stdout,
  });
  const certPath = path.join(fx.repoRoot, "research", SLUG, CERTIFICATE_FILENAME);
  const originalCert = JSON.parse(await readFile(certPath, "utf8"));

  await t.test("missing public key fails closed", async () => {
    const code = await runCertificateCli(
      ["verify", "--root", fx.repoRoot, "--slug", SLUG],
      { env: {}, validatorRunner: fx.validatorRunner, stdout: captureIo().stdout, stderr: captureIo().stderr },
    );
    assert.notEqual(code, 0);
  });

  await t.test("tampered signature fails", async () => {
    const badSig = structuredClone(originalCert);
    const buf = Buffer.from(badSig.signature, "base64");
    buf[0] ^= 0xff;
    badSig.signature = buf.toString("base64");
    await writeFile(certPath, JSON.stringify(badSig, null, 2), "utf8");
    await assert.rejects(
      runVerifyCommand({
        root: fx.repoRoot,
        slug: SLUG,
        publicKey: fx.publicKeyPath,
        validatorRunner: fx.validatorRunner,
        stdout: captureIo().stdout,
      }),
      /signature/i,
    );
    await writeFile(certPath, JSON.stringify(originalCert, null, 2), "utf8");
  });

  await t.test("keyId cannot be relabeled to another trusted-key identity", async () => {
    const relabeled = structuredClone(originalCert);
    relabeled.keyId = "ed25519-0000000000000000";
    await writeFile(certPath, JSON.stringify(relabeled, null, 2), "utf8");
    await assert.rejects(
      runVerifyCommand({
        root: fx.repoRoot,
        slug: SLUG,
        publicKey: fx.publicKeyPath,
        validatorRunner: fx.validatorRunner,
        stdout: captureIo().stdout,
      }),
      /keyId does not match/i,
    );
    await writeFile(certPath, JSON.stringify(originalCert, null, 2), "utf8");
  });

  await t.test("tampered payload fails", async () => {
    const badPayload = structuredClone(originalCert);
    badPayload.payload.agyVersion = "agy 9.9.9";
    badPayload.payloadHash = sha256Bytes(Buffer.from(canonicalJson(badPayload.payload), "utf8"));
    await writeFile(certPath, JSON.stringify(badPayload, null, 2), "utf8");
    await assert.rejects(
      runVerifyCommand({
        root: fx.repoRoot,
        slug: SLUG,
        publicKey: fx.publicKeyPath,
        validatorRunner: fx.validatorRunner,
        stdout: captureIo().stdout,
      }),
      /signature/i,
    );
    await writeFile(certPath, JSON.stringify(originalCert, null, 2), "utf8");
  });

  await t.test("wrong slug fails", async () => {
    const otherSlug = "other-9999";
    await mkdir(path.join(fx.repoRoot, "research", otherSlug), { recursive: true });
    await writeFile(
      path.join(fx.repoRoot, "research", otherSlug, CERTIFICATE_FILENAME),
      JSON.stringify(originalCert, null, 2),
      "utf8",
    );
    await assert.rejects(
      runVerifyCommand({
        root: fx.repoRoot,
        slug: otherSlug,
        publicKey: fx.publicKeyPath,
        validatorRunner: fx.validatorRunner,
        stdout: captureIo().stdout,
      }),
      /slug/i,
    );
  });

  await t.test("stale report HTML fails", async () => {
    const origReport = await readFile(fx.reportPath, "utf8");
    await writeFile(fx.reportPath, origReport + "<!-- modified -->\n", "utf8");
    await assert.rejects(
      runVerifyCommand({
        root: fx.repoRoot,
        slug: SLUG,
        publicKey: fx.publicKeyPath,
        validatorRunner: fx.validatorRunner,
        stdout: captureIo().stdout,
      }),
      /reportHash/i,
    );
    await writeFile(fx.reportPath, origReport, "utf8");
  });

  await t.test("stale package sources (sourceHash) fails", async () => {
    const origPkg = JSON.parse(await readFile(fx.pkgPath, "utf8"));
    const modifiedPkg = structuredClone(origPkg);
    modifiedPkg.sources.push({ id: "src-2", evidenceClass: "official", provider: "TWSE", title: "Extra" });
    await writeFile(fx.pkgPath, JSON.stringify(modifiedPkg, null, 2), "utf8");
    await assert.rejects(
      runVerifyCommand({
        root: fx.repoRoot,
        slug: SLUG,
        publicKey: fx.publicKeyPath,
        validatorRunner: fx.validatorRunner,
        stdout: captureIo().stdout,
      }),
      /sourceHash/i,
    );
    await writeFile(fx.pkgPath, JSON.stringify(origPkg, null, 2), "utf8");
  });

  for (const staleKey of ["packageHash", "profileHash", "verifierCodeHash", "policyHash"]) {
    await t.test(`stale ${staleKey} from validator fails`, async () => {
      fx.setValidatorState(
        await fx.computeValidatorOutput({ hashes: { [staleKey]: makeHex(`stale-${staleKey}`) } }),
      );
      await assert.rejects(
        runVerifyCommand({
          root: fx.repoRoot,
          slug: SLUG,
          publicKey: fx.publicKeyPath,
          validatorRunner: fx.validatorRunner,
          stdout: captureIo().stdout,
        }),
        new RegExp(staleKey),
      );
      fx.setValidatorState(await fx.computeValidatorOutput());
    });
  }

  await t.test("current validator BLOCKED fails closed", async () => {
    fx.setValidatorState(await fx.computeValidatorOutput({ status: "BLOCKED" }));
    const code = await runCertificateCli(
      ["verify", "--root", fx.repoRoot, "--slug", SLUG, "--public-key", fx.publicKeyPath],
      { validatorRunner: fx.validatorRunner, stdout: captureIo().stdout, stderr: captureIo().stderr },
    );
    assert.notEqual(code, 0);
    fx.setValidatorState(await fx.computeValidatorOutput());
  });

  await t.test("NOT_VERIFIED due only to absent local evidence still verifies the signed package", async () => {
    fx.setValidatorState(await fx.computeValidatorOutput({
      status: "NOT_VERIFIED",
      hashes: {
        evidenceHash: makeHex("evidence-unavailable"),
        recomputeHash: makeHex("recompute-unavailable"),
        checksHash: makeHex("checks-unavailable"),
      },
    }));
    const io = captureIo();
    const code = await runCertificateCli(
      ["verify", "--root", fx.repoRoot, "--slug", SLUG, "--public-key", fx.publicKeyPath],
      { validatorRunner: fx.validatorRunner, stdout: io.stdout, stderr: io.stderr },
    );
    assert.equal(code, 0, io.getStderr());
    assert.equal(JSON.parse(io.getStdout()).currentValidationStatus, "NOT_VERIFIED");
    fx.setValidatorState(await fx.computeValidatorOutput());
  });

  await t.test("NOT_VERIFIED with a blocking check is rejected", async () => {
    const nv = await fx.computeValidatorOutput({ status: "NOT_VERIFIED" });
    nv.result.checks.push({ id: "synthetic.blocked", category: "eps_recompute", status: "BLOCKED" });
    nv.result.counts.BLOCKED = 1;
    nv.result.blockedIds = ["synthetic.blocked"];
    fx.setValidatorState(nv);
    const code = await runCertificateCli(
      ["verify", "--root", fx.repoRoot, "--slug", SLUG, "--public-key", fx.publicKeyPath],
      { validatorRunner: fx.validatorRunner, stdout: captureIo().stdout, stderr: captureIo().stderr },
    );
    assert.notEqual(code, 0);
    fx.setValidatorState(await fx.computeValidatorOutput());
  });
});

test("path boundary checks reject review/output/private-key escapes and symlinks", async (t) => {
  const fx = await createTempFixture(t);

  // 1. Private key inside repoRoot must be rejected
  const keyInRepo = path.join(fx.repoRoot, "inside-private.pem");
  await writeFile(keyInRepo, await readFile(fx.privateKeyPath, "utf8"), "utf8");
  await assert.rejects(
    runSignCommand({
      root: fx.repoRoot,
      slug: SLUG,
      review: fx.reviewPath,
      privateKey: keyInRepo,
      validatorRunner: fx.validatorRunner,
      stdout: captureIo().stdout,
    }),
    /private-key path inside repository root/i,
  );

  // 2. Review path outside <root>/.research-verification/ must be rejected
  const outsideReview = path.join(fx.repoRoot, "research", SLUG, "review.json");
  await writeFile(outsideReview, await readFile(fx.reviewPath, "utf8"), "utf8");
  await assert.rejects(
    runSignCommand({
      root: fx.repoRoot,
      slug: SLUG,
      review: outsideReview,
      privateKey: fx.privateKeyPath,
      validatorRunner: fx.validatorRunner,
      stdout: captureIo().stdout,
    }),
    /\.research-verification/i,
  );

  // 3. Output path outside <root>/research/<slug>/verification-certificate.json must be rejected
  for (const badOut of [
    path.join(fx.outsideDir, CERTIFICATE_FILENAME),
    path.join(fx.repoRoot, "research", SLUG, "wrong-name.json"),
    path.join(fx.repoRoot, "research", CertificateTraversalPath()),
  ]) {
    await assert.rejects(
      runSignCommand({
        root: fx.repoRoot,
        slug: SLUG,
        review: fx.reviewPath,
        privateKey: fx.privateKeyPath,
        output: badOut,
        validatorRunner: fx.validatorRunner,
        stdout: captureIo().stdout,
      }),
    );
  }

  // 4. Symlink escape on review record (if OS allows creating symlinks)
  const extReview = path.join(fx.outsideDir, "ext-review.json");
  await writeFile(extReview, await readFile(fx.reviewPath, "utf8"), "utf8");
  const symReview = path.join(fx.repoRoot, ".research-verification", SLUG, "symlink-review.json");
  let symlinkCreated = false;
  try {
    await symlink(extReview, symReview);
    symlinkCreated = true;
  } catch {
    symlinkCreated = false;
  }
  if (symlinkCreated) {
    await assert.rejects(
      runSignCommand({
        root: fx.repoRoot,
        slug: SLUG,
        review: symReview,
        privateKey: fx.privateKeyPath,
        validatorRunner: fx.validatorRunner,
        stdout: captureIo().stdout,
      }),
      /symlink/i,
    );
  }
});

function CertificateTraversalPath() {
  return `../${CERTIFICATE_FILENAME}`;
}

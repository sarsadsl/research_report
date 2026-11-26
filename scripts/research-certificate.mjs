import { spawnSync } from "node:child_process";
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as cryptoSign,
  verify as cryptoVerify,
} from "node:crypto";
import { chmod, lstat, mkdir, open, readFile, realpath, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { assertSafeSlug, canonicalJson, sha256 } from "./research-lib.mjs";

export const CERTIFICATE_SCHEMA_VERSION = "1.0.0";
export const CERTIFICATE_FILENAME = "verification-certificate.json";
export const VERIFICATION_POLICY_VERSION = "1.0.0";
export const PUBLIC_KEY_ENV_VAR = "RESEARCH_VERIFICATION_PUBLIC_KEY";
export const PYTHON_ENV_VAR = "RESEARCH_VERIFICATION_PYTHON";

const VALIDATOR_ENV_ALLOWLIST = new Set([
  "PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "COMSPEC", "SYSTEMDRIVE",
  "TEMP", "TMP", "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "APPDATA",
  "LOCALAPPDATA", "PROGRAMDATA", "PROGRAMFILES", "PROGRAMFILES(X86)",
  "LANG", "LC_ALL", "TZ", PYTHON_ENV_VAR,
]);

export const VALIDATOR_HASH_KEYS = [
  "packageHash",
  "manifestHash",
  "profileHash",
  "evidenceHash",
  "recomputeHash",
  "policyHash",
  "verifierCodeHash",
  "checksHash",
];

const HEX64_RE = /^[a-f0-9]{64}$/;
const GEMINI_MODEL_RE = /^gemini-4-argon-(?:high|medium|low)$/;
const CODEX_MODEL_RE = /^(?:codex-cli-default|gpt-[a-z0-9.-]+)$/;
const ALLOWED_AGY_FAILOVER = new Set([
  "AGY_NOT_FOUND", "AGY_TIMEOUT", "AGY_OS_ERROR",
  "AGY_VERSION_FAILED", "AGY_VERSION_EMPTY", "AGY_MODELS_FAILED",
  "MODEL_NOT_AVAILABLE", "AGY_CLI_NON_ZERO",
]);
function validReviewerProvenance(provider, assurance, model, reason) {
  if (provider === "agy-gemini") {
    return GEMINI_MODEL_RE.test(model) &&
      assurance === "independent-model-review" && reason === "";
  }
  if (provider === "codex-fallback") {
    return CODEX_MODEL_RE.test(model) &&
      assurance === "internal-fallback-review" &&
      ALLOWED_AGY_FAILOVER.has(reason);
  }
  return false;
}
const ALLOWED_REVIEW_STATUSES = new Set(["PASS", "PASS_WITH_P2"]);
const KEY_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;

const ALLOWED_ENVELOPE_KEYS = new Set([
  "schemaVersion",
  "algorithm",
  "keyId",
  "payloadHash",
  "payload",
  "signature",
]);

const ALLOWED_PAYLOAD_KEYS = new Set([
  "schemaVersion",
  "policyVersion",
  "slug",
  "status",
  "deterministicStatus",
  "modelInvoked",
  "model",
  "reviewProvider",
  "assuranceLevel",
  "fallbackReason",
  "agyVersion",
  "reviewedAtUtc",
  "packageVersion",
  "reportVersion",
  "asOfDate",
  "packageHash",
  "manifestHash",
  "profileHash",
  "sourceHash",
  "reportHash",
  "policyHash",
  "verifierCodeHash",
  "evidenceHash",
  "recomputeHash",
  "checksHash",
  "reviewRecordHash",
  "promptSha256",
  "responseSha256",
  "findingCounts",
]);

const OPTIONAL_PAYLOAD_KEYS = new Set(["reviewProvider", "assuranceLevel", "fallbackReason"]);
const FORBIDDEN_CERTIFICATE_KEYS = new Set([
  "excerpt",
  "excerpts",
  "internalExcerpts",
  "prompt",
  "rawStdout",
  "rawStderr",
  "parsedResponse",
  "batches",
  "findings",
  "p3Notes",
  "sourceEvidence",
  "sourceEvidenceSummary",
  "privateKey",
  "privateKeyPem",
]);

export function sha256Bytes(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function rejectPemMaterialInArg(argValue, flagName) {
  const str = String(argValue ?? "");
  if (
    str.includes("-----BEGIN") ||
    str.includes("PRIVATE KEY") ||
    str.includes("PUBLIC KEY") ||
    str.includes("\n") ||
    str.includes("\r") ||
    str.includes("\0")
  ) {
    throw new Error(
      `Invalid path argument for ${flagName}: raw key material or control characters are not allowed in CLI arguments`,
    );
  }
}

export function resolvePythonCommand(env = process.env, platform = process.platform) {
  const custom = env && typeof env[PYTHON_ENV_VAR] === "string" ? env[PYTHON_ENV_VAR].trim() : "";
  if (custom) {
    return { command: custom, prefixArgs: [] };
  }
  if (platform === "win32") {
    return { command: "py", prefixArgs: ["-3"] };
  }
  return { command: "python3", prefixArgs: [] };
}

export function buildValidatorEnv(baseEnv = process.env) {
  const result = {};
  for (const [key, value] of Object.entries(baseEnv ?? {})) {
    if (typeof value === "string" && VALIDATOR_ENV_ALLOWLIST.has(key.toUpperCase())) {
      result[key] = value;
    }
  }
  return result;
}

export function defaultValidatorRunner({ root, slug, evidenceDir, env = process.env, timeoutMs = 60_000 }) {
  assertSafeSlug(slug);
  const { command, prefixArgs } = resolvePythonCommand(env);
  const args = [...prefixArgs, "-m", "verification", "validate", slug, "--root", root];
  if (evidenceDir) args.push("--evidence-dir", evidenceDir);
  const proc = spawnSync(command, args, {
    cwd: root,
    env: buildValidatorEnv(env),
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout: timeoutMs,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (proc.error) {
    throw new Error(`Python validator execution failed: ${proc.error.message}`);
  }
  const stdoutText = String(proc.stdout ?? "").trim();
  if (!stdoutText) {
    throw new Error(`Python validator returned empty output (exit ${proc.status ?? "unknown"})`);
  }
  let parsed;
  try {
    parsed = JSON.parse(stdoutText);
  } catch {
    throw new Error("Python validator did not emit a valid single JSON object");
  }
  return { exitCode: proc.status ?? 1, result: parsed };
}

function extractValidatorHash(validatorResult, key) {
  const topVal = validatorResult?.[key];
  const nestedVal = isPlainObject(validatorResult?.hashes) ? validatorResult.hashes[key] : undefined;
  if (topVal !== undefined && nestedVal !== undefined && topVal !== nestedVal) {
    throw new Error(`Validator output mismatch for ${key}`);
  }
  const val = topVal !== undefined ? topVal : nestedVal;
  if (typeof val !== "string" || !HEX64_RE.test(val)) {
    throw new Error(`Validator output missing or invalid 64-hex hash: ${key}`);
  }
  return val;
}

export function parseCertificateArgs(argv) {
  if (!Array.isArray(argv) || argv.length === 0) {
    throw new Error("Missing subcommand (expected keygen, sign, or verify)");
  }
  const [command, ...rest] = argv;
  if (!["keygen", "sign", "verify"].includes(command)) {
    throw new Error(`Unknown subcommand: ${command}`);
  }

  const allowedFlagsByCommand = {
    keygen: new Set(["--private-key"]),
    sign: new Set(["--root", "--slug", "--review", "--private-key", "--output", "--key-id", "--evidence-dir"]),
    verify: new Set(["--root", "--slug", "--certificate", "--public-key"]),
  };
  const allowedFlags = allowedFlagsByCommand[command];
  const parsed = { command };
  const seen = new Set();

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (typeof token !== "string" || !token.startsWith("--") || token.includes("=")) {
      throw new Error(`Unexpected or malformed argument: ${token}`);
    }
    if (!allowedFlags.has(token) || seen.has(token)) {
      throw new Error(`Invalid or duplicate option for ${command}: ${token}`);
    }
    seen.add(token);
    const value = rest[i + 1];
    if (value === undefined) {
      throw new Error(`Missing value for option ${token}`);
    }
    const cleanValue = String(value).trim();
    if (!cleanValue) {
      throw new Error(`Empty value for option ${token}`);
    }
    rejectPemMaterialInArg(cleanValue, token);
    if (cleanValue.startsWith("--")) {
      throw new Error(`Missing value for option ${token}`);
    }
    i += 1;

    if (token === "--private-key") parsed.privateKey = cleanValue;
    else if (token === "--root") parsed.root = cleanValue;
    else if (token === "--slug") {
      assertSafeSlug(cleanValue);
      parsed.slug = cleanValue;
    } else if (token === "--review") parsed.review = cleanValue;
    else if (token === "--output") parsed.output = cleanValue;
    else if (token === "--evidence-dir") parsed.evidenceDir = cleanValue;
    else if (token === "--key-id") {
      if (!KEY_ID_RE.test(cleanValue)) throw new Error("Invalid --key-id format");
      parsed.keyId = cleanValue;
    } else if (token === "--certificate") parsed.certificate = cleanValue;
    else if (token === "--public-key") parsed.publicKey = cleanValue;
  }

  if (command === "keygen" && !parsed.privateKey) {
    throw new Error("keygen requires --private-key <path>");
  }
  if (command === "sign" && (!parsed.root || !parsed.slug || !parsed.review || !parsed.privateKey)) {
    throw new Error("sign requires --root, --slug, --review, and --private-key");
  }
  if (command === "verify" && (!parsed.root || !parsed.slug)) {
    throw new Error("verify requires --root and --slug");
  }
  return parsed;
}

function isPathInside(childPath, parentPath) {
  const rel = path.relative(parentPath, childPath);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function isStrictSubpath(childPath, parentPath) {
  const rel = path.relative(parentPath, childPath);
  return Boolean(rel && rel !== "." && !rel.startsWith("..") && !path.isAbsolute(rel));
}

async function resolveExistingRoot(rootInput) {
  const resolved = path.resolve(String(rootInput));
  const st = await stat(resolved).catch(() => null);
  if (!st || !st.isDirectory()) {
    throw new Error("Specified --root directory does not exist or is not a directory");
  }
  return realpath(resolved);
}

async function resolveRealTargetWithExistingAncestors(candidatePath) {
  const abs = path.resolve(candidatePath);
  const parts = [];
  let curr = abs;
  while (true) {
    try {
      const realCurr = await realpath(curr);
      return path.join(realCurr, ...parts.reverse());
    } catch (err) {
      if (err && err.code !== "ENOENT") throw err;
      const parent = path.dirname(curr);
      if (parent === curr) return abs;
      parts.push(path.basename(curr));
      curr = parent;
    }
  }
}

async function assertNoSymlinkChainWithin(baseReal, targetAbs) {
  const rel = path.relative(baseReal, targetAbs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Target path escapes allowed boundary");
  }
  let curr = baseReal;
  for (const seg of rel.split(path.sep).filter(Boolean)) {
    curr = path.join(curr, seg);
    const lst = await lstat(curr).catch((err) => (err?.code === "ENOENT" ? null : Promise.reject(err)));
    if (lst && lst.isSymbolicLink()) {
      throw new Error("Symbolic links are not allowed along verified path");
    }
  }
}

async function resolveAndValidatePrivateKeyOutsideRoot(privateKeyArg, rootReal) {
  rejectPemMaterialInArg(privateKeyArg, "--private-key");
  const candidateAbs = path.resolve(privateKeyArg);
  const candidateReal = await resolveRealTargetWithExistingAncestors(candidateAbs);
  if (isPathInside(candidateAbs, rootReal) || isPathInside(candidateReal, rootReal)) {
    throw new Error("Refusing private-key path inside repository root");
  }
  const lst = await lstat(candidateAbs).catch(() => null);
  if (!lst || lst.isSymbolicLink() || !lst.isFile()) {
    throw new Error("Private key file does not exist or must be a regular non-symlink file");
  }
  return candidateReal;
}

async function resolveAndValidateReviewPath(reviewArg, rootReal) {
  const allowedBaseAbs = path.join(rootReal, ".research-verification");
  const candidateAbs = path.isAbsolute(reviewArg)
    ? path.resolve(reviewArg)
    : path.resolve(rootReal, reviewArg);
  if (!isStrictSubpath(candidateAbs, allowedBaseAbs)) {
    throw new Error("Review record path must reside inside <root>/.research-verification/");
  }
  await assertNoSymlinkChainWithin(rootReal, candidateAbs);
  const st = await lstat(candidateAbs).catch(() => null);
  if (!st || st.isSymbolicLink() || !st.isFile()) {
    throw new Error("Review record must be an existing regular file");
  }
  const realCandidate = await realpath(candidateAbs);
  const realAllowedBase = await resolveRealTargetWithExistingAncestors(allowedBaseAbs);
  if (!isStrictSubpath(realCandidate, realAllowedBase) || !isStrictSubpath(realCandidate, rootReal)) {
    throw new Error("Review record realpath escapes <root>/.research-verification/");
  }
  if (path.extname(realCandidate).toLowerCase() !== ".json") {
    throw new Error("Review record must be a .json file");
  }
  return realCandidate;
}

async function resolveAndValidateCertificatePath(certArg, rootReal, slug, requireExists = false) {
  assertSafeSlug(slug);
  const slugDirAbs = path.join(rootReal, "research", slug);
  const candidateAbs = certArg
    ? path.isAbsolute(certArg)
      ? path.resolve(certArg)
      : path.resolve(rootReal, certArg)
    : path.join(slugDirAbs, CERTIFICATE_FILENAME);

  if (path.basename(candidateAbs) !== CERTIFICATE_FILENAME || path.dirname(candidateAbs) !== slugDirAbs) {
    throw new Error(`Certificate path must resolve to research/${slug}/${CERTIFICATE_FILENAME}`);
  }
  await assertNoSymlinkChainWithin(rootReal, candidateAbs);
  const realTarget = await resolveRealTargetWithExistingAncestors(candidateAbs);
  const realSlugDir = await resolveRealTargetWithExistingAncestors(slugDirAbs);
  if (
    path.basename(realTarget) !== CERTIFICATE_FILENAME ||
    path.dirname(realTarget) !== realSlugDir ||
    !isStrictSubpath(realTarget, rootReal)
  ) {
    throw new Error("Certificate path escapes <root>/research/<slug>/ boundary");
  }
  if (requireExists) {
    const lst = await lstat(realTarget).catch(() => null);
    if (!lst || lst.isSymbolicLink() || !lst.isFile()) {
      throw new Error("Verification certificate file does not exist or is invalid");
    }
  }
  return realTarget;
}

export async function inspectCurrentState(
  rootReal,
  slug,
  {
    validatorRunner = defaultValidatorRunner,
    env = process.env,
    evidenceDir,
    allowEvidenceUnavailable = false,
  } = {},
) {
  assertSafeSlug(slug);
  const rawRunnerOut = await validatorRunner({ root: rootReal, slug, evidenceDir, env });
  const validatorResult =
    isPlainObject(rawRunnerOut) && isPlainObject(rawRunnerOut.result)
      ? rawRunnerOut.result
      : rawRunnerOut;
  const exitCode =
    isPlainObject(rawRunnerOut) && typeof rawRunnerOut.exitCode === "number"
      ? rawRunnerOut.exitCode
      : validatorResult?.status === "PASS"
        ? 0
        : 1;

  if (!isPlainObject(validatorResult)) {
    throw new Error("Python validator result must be a JSON object");
  }
  const isPass = exitCode === 0 && validatorResult.status === "PASS" && validatorResult.ok === true;
  const blockedCount = Number(validatorResult.counts?.BLOCKED ?? validatorResult.summary?.blockedCount ?? 0);
  const notVerifiedCount = Number(validatorResult.counts?.NOT_VERIFIED ?? validatorResult.summary?.notVerifiedCount ?? 0);
  const hasBlockedChecks = Array.isArray(validatorResult.checks) &&
    validatorResult.checks.some((check) => check?.status === "BLOCKED");
  const evidenceUnavailableOnly = allowEvidenceUnavailable &&
    exitCode === 1 && validatorResult.status === "NOT_VERIFIED" && validatorResult.ok === false &&
    blockedCount === 0 && notVerifiedCount > 0 &&
    (!Array.isArray(validatorResult.blockedIds) || validatorResult.blockedIds.length === 0) &&
    !hasBlockedChecks;
  if (!isPass && !evidenceUnavailableOnly) {
    throw new Error(
      `Current Python validator status is ${validatorResult.status ?? "UNKNOWN"} (must be PASS${allowEvidenceUnavailable ? " or NOT_VERIFIED without BLOCKED checks" : ""})`,
    );
  }
  if (validatorResult.slug !== slug) {
    throw new Error(`Python validator slug '${validatorResult.slug}' does not match '${slug}'`);
  }
  if (validatorResult.policyVersion !== VERIFICATION_POLICY_VERSION) {
    throw new Error(`Unsupported validator policyVersion: ${validatorResult.policyVersion}`);
  }

  const validatorHashes = {};
  for (const k of VALIDATOR_HASH_KEYS) {
    validatorHashes[k] = extractValidatorHash(validatorResult, k);
  }

  const pkgRel = `research/${slug}/research-package.json`;
  const manifestRel = `research/${slug}/manifest.json`;
  const profilesRel = `research/${slug}/report-profiles.json`;
  for (const rel of [pkgRel, manifestRel, profilesRel]) {
    await assertNoSymlinkChainWithin(rootReal, path.join(rootReal, ...rel.split("/")));
  }

  const [pkgBytes, manifestBytes, profilesBytes] = await Promise.all([
    readFile(path.join(rootReal, ...pkgRel.split("/"))),
    readFile(path.join(rootReal, ...manifestRel.split("/"))),
    readFile(path.join(rootReal, ...profilesRel.split("/"))),
  ]);
  const pkg = JSON.parse(pkgBytes.toString("utf8"));
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const profilesDoc = JSON.parse(profilesBytes.toString("utf8"));

  const expectedReportRel = `public/research/reports/${slug}.html`;
  const configuredOutput = String(profilesDoc?.profiles?.["full-research"]?.output ?? "").replaceAll(
    "\\",
    "/",
  );
  if (configuredOutput !== expectedReportRel) {
    throw new Error(
      `Invalid full-research output in report-profiles.json: expected ${expectedReportRel}, got ${configuredOutput}`,
    );
  }
  const reportAbs = path.join(rootReal, ...configuredOutput.split("/"));
  await assertNoSymlinkChainWithin(rootReal, reportAbs);
  const reportStat = await lstat(reportAbs).catch(() => null);
  if (!reportStat || reportStat.isSymbolicLink() || !reportStat.isFile()) {
    throw new Error(`Missing or invalid full-research report file: ${configuredOutput}`);
  }
  const reportBytes = await readFile(reportAbs);
  const reportHash = sha256Bytes(reportBytes);
  const sourceHash = sha256(pkg.sources);

  return {
    validatorResult,
    validationStatus: validatorResult.status,
    pkg,
    manifest,
    packageVersion: String(validatorResult.packageVersion ?? pkg.packageVersion ?? ""),
    reportVersion: String(validatorResult.reportVersion ?? pkg.report?.version ?? manifest.reportVersion ?? ""),
    asOfDate: String(validatorResult.asOfDate ?? pkg.asOfDate ?? ""),
    hashes: {
      ...validatorHashes,
      sourceHash,
      reportHash,
    },
  };
}

function derivePublicKeyId(publicPem) {
  const spkiDer = createPublicKey(publicPem).export({ type: "spki", format: "der" });
  return `ed25519-${sha256Bytes(spkiDer).slice(0, 16)}`;
}

async function atomicWriteBuffer(targetPath, buffer, mode = 0o644) {
  const dir = path.dirname(targetPath);
  await mkdir(dir, { recursive: true });
  const tmpPath = path.join(dir, `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.tmp`);
  let handle;
  try {
    handle = await open(tmpPath, "wx", mode);
    await handle.writeFile(buffer);
    await handle.sync();
    await handle.close();
    handle = null;
    await chmod(tmpPath, mode).catch(() => {});
    await rename(tmpPath, targetPath);
  } catch (err) {
    if (handle) await handle.close().catch(() => {});
    await rm(tmpPath, { force: true }).catch(() => {});
    throw err;
  }
}

export async function runKeygenCommand({ privateKeyPath, stdout = process.stdout }) {
  rejectPemMaterialInArg(privateKeyPath, "--private-key");
  const absPrivatePath = path.resolve(privateKeyPath);
  const projectRoot = await realpath(process.cwd());
  const privateTargetReal = await resolveRealTargetWithExistingAncestors(absPrivatePath);
  if (isPathInside(absPrivatePath, projectRoot) || isPathInside(privateTargetReal, projectRoot)) {
    throw new Error("Refusing to create signing private key inside the current project directory");
  }
  if ((await lstat(absPrivatePath).catch(() => null)) !== null) {
    throw new Error("Refusing to overwrite existing private key file");
  }
  await mkdir(path.dirname(absPrivatePath), { recursive: true, mode: 0o700 });
  const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  let handle;
  try {
    handle = await open(absPrivatePath, "wx", 0o600);
    await handle.writeFile(privateKey, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;
    await chmod(absPrivatePath, 0o600).catch(() => {});
  } catch (err) {
    if (handle) await handle.close().catch(() => {});
    throw err;
  }

  if (stdout && typeof stdout.write === "function") {
    stdout.write(publicKey);
  }
  return { publicKeyPem: publicKey, keyId: derivePublicKeyId(publicKey) };
}

function validateReviewRecord(reviewDoc, slug, current) {
  if (!isPlainObject(reviewDoc)) throw new Error("Review record must be a JSON object");
  if (reviewDoc.schemaVersion !== "1.0.0") throw new Error("Unsupported review schemaVersion");
  if (reviewDoc.policyVersion !== VERIFICATION_POLICY_VERSION) {
    throw new Error("Unsupported review policyVersion");
  }
  if (reviewDoc.slug !== slug) throw new Error("Review slug does not match --slug");
  if (!ALLOWED_REVIEW_STATUSES.has(reviewDoc.status) || reviewDoc.ok !== true) {
    throw new Error(`Review status must be PASS or PASS_WITH_P2 with ok=true (got ${reviewDoc.status})`);
  }
  if (reviewDoc.deterministicStatus !== "PASS") {
    throw new Error(`Review deterministicStatus must be PASS (got ${reviewDoc.deterministicStatus})`);
  }
  if (reviewDoc.modelInvoked !== true) {
    throw new Error("Review modelInvoked must be true");
  }
  const model = typeof reviewDoc.model === "string" ? reviewDoc.model.trim() : "";
  const reviewProvider = reviewDoc.reviewProvider ?? "agy-gemini";
  const assuranceLevel = reviewDoc.assuranceLevel ??
    (reviewProvider === "agy-gemini" ? "independent-model-review" : "");
  const fallbackReason = reviewDoc.fallbackReason ?? "";
  if (!validReviewerProvenance(reviewProvider, assuranceLevel, model, fallbackReason)) {
    throw new Error("Review provider/model/assurance/fallback provenance is invalid");
  }
  const agyVersion =
    typeof reviewDoc.agyVersion === "string" && reviewDoc.agyVersion.trim()
      ? reviewDoc.agyVersion.trim()
      : isPlainObject(reviewDoc.agyMetadata) && typeof reviewDoc.agyMetadata.agyVersion === "string"
        ? reviewDoc.agyMetadata.agyVersion.trim()
        : "";
  if (!agyVersion) throw new Error("Review agyVersion must be non-empty");
  if (
    isPlainObject(reviewDoc.agyMetadata) &&
    typeof reviewDoc.agyMetadata.model === "string" &&
    reviewDoc.agyMetadata.model.trim() &&
    reviewDoc.agyMetadata.model.trim() !== model
  ) {
    throw new Error("Review agyMetadata.model does not match review.model");
  }
  if (
    (Array.isArray(reviewDoc.blockedReasons) && reviewDoc.blockedReasons.length > 0) ||
    (Array.isArray(reviewDoc.restrictedSourceIds) && reviewDoc.restrictedSourceIds.length > 0) ||
    (Array.isArray(reviewDoc.unavailableSourceIds) && reviewDoc.unavailableSourceIds.length > 0)
  ) {
    throw new Error("Review record has blocked, restricted, or unavailable sources");
  }
  if (!HEX64_RE.test(String(reviewDoc.promptSha256 ?? "")) || !HEX64_RE.test(String(reviewDoc.responseSha256 ?? ""))) {
    throw new Error("Review record missing valid promptSha256 or responseSha256");
  }

  for (const hKey of VALIDATOR_HASH_KEYS) {
    const revHash = extractValidatorHash(reviewDoc, hKey);
    if (revHash !== current.hashes[hKey]) {
      throw new Error(`Review ${hKey} (${revHash}) does not match current validator ${hKey} (${current.hashes[hKey]})`);
    }
  }

  const sev = reviewDoc.findingSummary?.severityCounts;
  const p0 = Number(sev?.P0);
  const p1 = Number(sev?.P1);
  const p2 = Number(sev?.P2);
  const p3 = Number(sev?.P3);
  if (![p0, p1, p2, p3].every((n) => Number.isInteger(n) && n >= 0) || p0 > 0 || p1 > 0) {
    throw new Error("Invalid severityCounts or non-zero P0/P1 findings in review record");
  }
  if (!Array.isArray(reviewDoc.findings)) throw new Error("Review record findings must be an array");
  const findingCounts = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const finding of reviewDoc.findings) {
    const severity = finding?.severity;
    if (!Object.hasOwn(findingCounts, severity)) {
      throw new Error(`Invalid finding severity in review record: ${severity}`);
    }
    findingCounts[severity] += 1;
    if (severity === "P2" && finding.disclosureVerified !== true) {
      throw new Error("Every P2 finding must have a verified disclosure location before signing");
    }
  }
  if (findingCounts.P0 !== p0 || findingCounts.P1 !== p1 || findingCounts.P2 !== p2) {
    throw new Error("Review finding list does not match declared P0/P1/P2 severity counts");
  }
  if ((reviewDoc.status === "PASS" && p2 > 0) || (reviewDoc.status === "PASS_WITH_P2" && p2 < 1)) {
    throw new Error("Review status does not match P2 finding count");
  }
  const completedAtUtc = String(reviewDoc.completedAtUtc || reviewDoc.startedAtUtc || "").trim();
  if (!completedAtUtc) throw new Error("Review record missing completedAtUtc");

  return {
    model,
    reviewProvider,
    assuranceLevel,
    fallbackReason,
    agyVersion,
    promptSha256: reviewDoc.promptSha256,
    responseSha256: reviewDoc.responseSha256,
    completedAtUtc,
    findingCounts: { P0: 0, P1: 0, P2: p2, P3: p3 },
  };
}

export async function runSignCommand({
  root,
  slug,
  review,
  privateKey,
  output,
  keyId,
  evidenceDir,
  validatorRunner = defaultValidatorRunner,
  env = process.env,
  stdout = process.stdout,
}) {
  assertSafeSlug(slug);
  const rootReal = await resolveExistingRoot(root);
  const privateKeyReal = await resolveAndValidatePrivateKeyOutsideRoot(privateKey, rootReal);
  const reviewReal = await resolveAndValidateReviewPath(review, rootReal);
  const certOutReal = await resolveAndValidateCertificatePath(output, rootReal, slug, false);

  let evidenceDirReal;
  if (evidenceDir) {
    const candidate = path.isAbsolute(evidenceDir)
      ? path.resolve(evidenceDir)
      : path.resolve(rootReal, evidenceDir);
    if (!isStrictSubpath(candidate, rootReal)) {
      throw new Error("Evidence directory must reside inside repository root");
    }
    await assertNoSymlinkChainWithin(rootReal, candidate);
    const evidenceStat = await lstat(candidate).catch(() => null);
    if (!evidenceStat || evidenceStat.isSymbolicLink() || !evidenceStat.isDirectory()) {
      throw new Error("Evidence directory must be an existing non-symlink directory");
    }
    evidenceDirReal = await realpath(candidate);
  }

  const [privateKeyPem, reviewBytes, current] = await Promise.all([
    readFile(privateKeyReal, "utf8"),
    readFile(reviewReal),
    inspectCurrentState(rootReal, slug, { validatorRunner, env, evidenceDir: evidenceDirReal }),
  ]);

  const privKeyObj = createPrivateKey(privateKeyPem);
  if (privKeyObj.asymmetricKeyType !== "ed25519") {
    throw new Error(`Expected ed25519 private key, got ${privKeyObj.asymmetricKeyType}`);
  }
  const pubPem = createPublicKey(privKeyObj).export({ type: "spki", format: "pem" });
  const derivedKeyId = derivePublicKeyId(pubPem);
  if (keyId && String(keyId).trim() !== derivedKeyId) {
    throw new Error("--key-id must match the derived Ed25519 public-key fingerprint");
  }
  if (!KEY_ID_RE.test(derivedKeyId)) throw new Error("Invalid keyId format");

  const reviewDoc = JSON.parse(reviewBytes.toString("utf8"));
  const validated = validateReviewRecord(reviewDoc, slug, current);
  const reviewRecordHash = sha256Bytes(reviewBytes);

  const payload = {
    schemaVersion: CERTIFICATE_SCHEMA_VERSION,
    policyVersion: VERIFICATION_POLICY_VERSION,
    slug,
    status: reviewDoc.status,
    deterministicStatus: "PASS",
    modelInvoked: true,
    model: validated.model,
    reviewProvider: validated.reviewProvider,
    assuranceLevel: validated.assuranceLevel,
    fallbackReason: validated.fallbackReason,
    agyVersion: validated.agyVersion,
    reviewedAtUtc: validated.completedAtUtc,
    packageVersion: current.packageVersion,
    reportVersion: current.reportVersion,
    asOfDate: current.asOfDate,
    packageHash: current.hashes.packageHash,
    manifestHash: current.hashes.manifestHash,
    profileHash: current.hashes.profileHash,
    sourceHash: current.hashes.sourceHash,
    reportHash: current.hashes.reportHash,
    policyHash: current.hashes.policyHash,
    verifierCodeHash: current.hashes.verifierCodeHash,
    evidenceHash: current.hashes.evidenceHash,
    recomputeHash: current.hashes.recomputeHash,
    checksHash: current.hashes.checksHash,
    reviewRecordHash,
    promptSha256: validated.promptSha256,
    responseSha256: validated.responseSha256,
    findingCounts: validated.findingCounts,
  };

  const canonicalPayloadBytes = Buffer.from(canonicalJson(payload), "utf8");
  const signature = cryptoSign(null, canonicalPayloadBytes, privKeyObj).toString("base64");
  const payloadHash = sha256Bytes(canonicalPayloadBytes);

  const certificateEnvelope = {
    schemaVersion: CERTIFICATE_SCHEMA_VERSION,
    algorithm: "Ed25519",
    keyId: derivedKeyId,
    payloadHash,
    payload,
    signature,
  };

  await atomicWriteBuffer(certOutReal, Buffer.from(JSON.stringify(certificateEnvelope, null, 2) + "\n", "utf8"));
  const summary = {
    schemaVersion: CERTIFICATE_SCHEMA_VERSION,
    command: "sign",
    slug,
    status: payload.status,
    ok: true,
    keyId: derivedKeyId,
    certificatePath: path.relative(rootReal, certOutReal).replaceAll("\\", "/"),
    payloadHash,
    reviewRecordHash,
  };
  if (stdout && typeof stdout.write === "function") stdout.write(JSON.stringify(summary) + "\n");
  return { certificate: certificateEnvelope, summary, certificatePath: certOutReal };
}

async function loadTrustedPublicKey({ publicKeyPath, rootReal, env = process.env }) {
  let pemText = "";
  if (publicKeyPath) {
    rejectPemMaterialInArg(publicKeyPath, "--public-key");
    const abs = path.isAbsolute(publicKeyPath) ? path.resolve(publicKeyPath) : path.resolve(rootReal, publicKeyPath);
    const lst = await lstat(abs).catch(() => null);
    if (!lst || lst.isSymbolicLink() || !lst.isFile()) {
      throw new Error("Trusted public key file does not exist or is invalid");
    }
    pemText = await readFile(abs, "utf8");
  } else if (env && typeof env[PUBLIC_KEY_ENV_VAR] === "string" && env[PUBLIC_KEY_ENV_VAR].trim()) {
    pemText = env[PUBLIC_KEY_ENV_VAR].trim();
  } else {
    throw new Error(`Missing trusted Ed25519 public key (--public-key or ${PUBLIC_KEY_ENV_VAR})`);
  }
  if (pemText.includes("PRIVATE KEY")) throw new Error("Refusing private key where public key is required");
  const pubKeyObj = createPublicKey(pemText);
  if (pubKeyObj.asymmetricKeyType !== "ed25519") {
    throw new Error(`Unsupported public key algorithm: ${pubKeyObj.asymmetricKeyType}`);
  }
  return pubKeyObj;
}

function assertNoForbiddenFields(node, at = "$") {
  if (Array.isArray(node)) {
    node.forEach((item, idx) => assertNoForbiddenFields(item, `${at}[${idx}]`));
  } else if (isPlainObject(node)) {
    for (const [k, v] of Object.entries(node)) {
      if (FORBIDDEN_CERTIFICATE_KEYS.has(k)) {
        throw new Error(`Certificate contains forbidden sensitive field at ${at}.${k}`);
      }
      assertNoForbiddenFields(v, `${at}.${k}`);
    }
  }
}

export async function runVerifyCommand({
  root,
  slug,
  certificate,
  publicKey,
  validatorRunner = defaultValidatorRunner,
  env = process.env,
  stdout = process.stdout,
}) {
  assertSafeSlug(slug);
  const rootReal = await resolveExistingRoot(root);
  const certReal = await resolveAndValidateCertificatePath(certificate, rootReal, slug, true);
  const pubKeyObj = await loadTrustedPublicKey({ publicKeyPath: publicKey, rootReal, env });
  const certDoc = JSON.parse(await readFile(certReal, "utf8"));

  if (!isPlainObject(certDoc)) throw new Error("Certificate root must be a JSON object");
  assertNoForbiddenFields(certDoc);
  for (const k of Object.keys(certDoc)) {
    if (!ALLOWED_ENVELOPE_KEYS.has(k)) throw new Error(`Unsupported envelope field: ${k}`);
  }
  if (certDoc.schemaVersion !== CERTIFICATE_SCHEMA_VERSION || certDoc.algorithm !== "Ed25519") {
    throw new Error("Invalid certificate schemaVersion or algorithm");
  }
  if (typeof certDoc.keyId !== "string" || !KEY_ID_RE.test(certDoc.keyId)) {
    throw new Error("Invalid certificate keyId");
  }
  const trustedKeyId = derivePublicKeyId(pubKeyObj.export({ type: "spki", format: "pem" }));
  if (certDoc.keyId !== trustedKeyId) {
    throw new Error("Certificate keyId does not match the trusted public key");
  }
  if (typeof certDoc.signature !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(certDoc.signature)) {
    throw new Error("Invalid certificate signature format");
  }

  const payload = certDoc.payload;
  if (!isPlainObject(payload)) throw new Error("Certificate payload must be a JSON object");
  for (const k of Object.keys(payload)) {
    if (!ALLOWED_PAYLOAD_KEYS.has(k)) throw new Error(`Unsupported payload field: ${k}`);
  }
  for (const reqKey of ALLOWED_PAYLOAD_KEYS) {
    if (!OPTIONAL_PAYLOAD_KEYS.has(reqKey) && !Object.hasOwn(payload, reqKey)) throw new Error(`Missing required payload field: ${reqKey}`);
  }

  const canonicalPayloadBytes = Buffer.from(canonicalJson(payload), "utf8");
  if (certDoc.payloadHash !== sha256Bytes(canonicalPayloadBytes)) {
    throw new Error("Certificate payloadHash mismatch");
  }
  const sigBuffer = Buffer.from(certDoc.signature, "base64");
  if (sigBuffer.length !== 64 || !cryptoVerify(null, canonicalPayloadBytes, pubKeyObj, sigBuffer)) {
    throw new Error("Ed25519 signature verification failed");
  }

  if (
    payload.schemaVersion !== CERTIFICATE_SCHEMA_VERSION ||
    payload.policyVersion !== VERIFICATION_POLICY_VERSION ||
    payload.slug !== slug ||
    !ALLOWED_REVIEW_STATUSES.has(payload.status) ||
    payload.deterministicStatus !== "PASS" ||
    payload.modelInvoked !== true ||
    !validReviewerProvenance(
      payload.reviewProvider ?? "agy-gemini",
      payload.assuranceLevel ?? "independent-model-review",
      String(payload.model ?? ""),
      payload.fallbackReason ?? ""
    ) ||
    !String(payload.agyVersion ?? "").trim() ||
    !String(payload.reviewedAtUtc ?? "").trim()
  ) {
    throw new Error("Certificate payload failed policy, slug, status, or model checks");
  }

  const fc = payload.findingCounts;
  if (
    !isPlainObject(fc) ||
    fc.P0 !== 0 ||
    fc.P1 !== 0 ||
    !Number.isInteger(fc.P2) ||
    fc.P2 < 0 ||
    !Number.isInteger(fc.P3) ||
    fc.P3 < 0 ||
    (payload.status === "PASS" && fc.P2 !== 0) ||
    (payload.status === "PASS_WITH_P2" && fc.P2 < 1)
  ) {
    throw new Error("Invalid findingCounts in certificate payload");
  }

  for (const hKey of [
    ...VALIDATOR_HASH_KEYS,
    "sourceHash",
    "reportHash",
    "reviewRecordHash",
    "promptSha256",
    "responseSha256",
  ]) {
    if (typeof payload[hKey] !== "string" || !HEX64_RE.test(payload[hKey])) {
      throw new Error(`Invalid 64-char hex hash in payload.${hKey}`);
    }
  }

  const current = await inspectCurrentState(rootReal, slug, {
    validatorRunner,
    env,
    allowEvidenceUnavailable: true,
  });
  const currentHashKeys = ["packageHash", "manifestHash", "profileHash", "policyHash", "verifierCodeHash"];
  if (current.validationStatus === "PASS") {
    currentHashKeys.push("evidenceHash", "recomputeHash", "checksHash");
  }
  for (const hKey of [...currentHashKeys, "sourceHash", "reportHash"]) {
    if (payload[hKey] !== current.hashes[hKey]) {
      throw new Error(`Stale or mismatched ${hKey}: signed ${payload[hKey]} !== current ${current.hashes[hKey]}`);
    }
  }
  if (
    payload.packageVersion !== current.packageVersion ||
    payload.reportVersion !== current.reportVersion ||
    payload.asOfDate !== current.asOfDate
  ) {
    throw new Error("Stale or mismatched packageVersion, reportVersion, or asOfDate");
  }

  const summary = {
    schemaVersion: CERTIFICATE_SCHEMA_VERSION,
    command: "verify",
    slug,
    status: payload.status,
    ok: true,
    currentValidationStatus: current.validationStatus,
    keyId: certDoc.keyId,
    model: payload.model,
    payloadHash: certDoc.payloadHash,
    packageHash: payload.packageHash,
    reportHash: payload.reportHash,
    verifierCodeHash: payload.verifierCodeHash,
  };
  if (stdout && typeof stdout.write === "function") stdout.write(JSON.stringify(summary) + "\n");
  return { ok: true, certificate: certDoc, summary };
}

export async function runCertificateCli(argv = process.argv.slice(2), io = {}) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const env = io.env ?? process.env;
  const validatorRunner = io.validatorRunner ?? defaultValidatorRunner;
  try {
    const parsed = parseCertificateArgs(argv);
    if (parsed.command === "keygen") {
      await runKeygenCommand({ privateKeyPath: parsed.privateKey, stdout });
      return 0;
    }
    if (parsed.command === "sign") {
      await runSignCommand({ ...parsed, validatorRunner, env, stdout });
      return 0;
    }
    if (parsed.command === "verify") {
      await runVerifyCommand({ ...parsed, validatorRunner, env, stdout });
      return 0;
    }
    throw new Error(`Unsupported command: ${parsed.command}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (stderr && typeof stderr.write === "function") {
      stderr.write(
        JSON.stringify({
          schemaVersion: CERTIFICATE_SCHEMA_VERSION,
          status: "BLOCKED",
          ok: false,
          error: message,
        }) + "\n",
      );
    }
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCertificateCli().then((code) => {
    process.exitCode = code;
  });
}

# Agy → Local Codex automatic fallback (design + operating guide)

Status: **Code published to main in PR #22; local authenticated Windows live test remains required.** GitHub CI uses simulated CLI calls, not the user's local account.

## User policy

- Primary reviewer: Agy CLI / Gemini.
- Backup reviewer: **new isolated non-interactive Codex CLI session**, used only on Agy infrastructure failure.
- Never invoke Codex for P0/P1, missing evidence, deterministic NOT_VERIFIED/BLOCKED, invalid model JSON, unverified P2 disclosures, any recorded Agy findings, or a failed batch with incomplete model output.
- If Agy starts but fails with an allowlisted transport error, Codex restarts the full review only when the primary record is saved, no findings exist, and no failed batch contains partial model output. A completed clean batch does not prevent restart. Never choose a favorable model result over a prior adverse finding.
- A model judgment never overrides Python deterministic calculation, citation availability, or report-version SHA-256.
- If both providers are unusable, the report is **BLOCKED**; do not bypass signing.
- Codes that allow automatic fallback: AGY_NOT_FOUND, AGY_TIMEOUT, AGY_OS_ERROR, AGY_VERSION_FAILED, AGY_VERSION_EMPTY, AGY_MODELS_FAILED, MODEL_NOT_AVAILABLE, AGY_CLI_NON_ZERO.

## Local Windows run

Run these from the trusted local checkout, with Python dependencies installed. Agy and Codex must be installed and authenticated **on the same Windows computer where this command is run**.

```powershell
cd 'C:\Users\Wei&Ting\Documents\Codex\research_report'
python -m pip install -r requirements-verification.txt

# Primary Agy/Gemini; automatically fallback to Codex on eligible CLI outage
python -m verification review unimicron-3037 --fallback codex

# Optional: pin an available Codex CLI model
python -m verification review unimicron-3037 --fallback codex --codex-model gpt-6

# To disable fallback and use existing Gemini-only behavior
python -m verification review unimicron-3037 --fallback none

# Alternative dedicated automatic dispatcher
python -m verification.auto_review unimicron-3037
```

**NOTE:** The signer currently deliberately supports only `codex-cli-default` as the signed Codex model identity; if you use `--codex-model gpt-6`, model review is still possible but signing will be refused until an explicit pinned-model allowlist is approved and recorded. For a complete automated signed flow, use the local configured model default and note that the exact model version is not independently attested.

The existing deterministic `python -m verification validate <slug>` command is still mandatory and is executed before either model is called.

### Restricted brokerage documents

Default: do not transmit restricted broker reports to external AI services. When source mapping includes restricted PDFs, both providers will block unless the operator **explicitly authorizes** the private review:

```powershell
python -m verification review unimicron-3037 --fallback codex --allow-private-source-review
```

This sends restricted excerpts to whichever authenticated model actually runs (Agy/Gemini first, Codex if Agy fails), not to public GitHub. Confirm data permissions before opting in. Records remain under Git-ignored `.research-verification/<slug>/<packageHash>/`.

### Records and provenance

- `gemini-review.json` is the original Agy status, including errors.
- `codex-review.json` is written ONLY when fallback is triggered.
- Each review record has `reviewProvider`, `assuranceLevel`, and `fallbackReason`.
- A successfully signed Codex fallback certificate carries `reviewProvider=codex-fallback`, `assuranceLevel=internal-fallback-review`, and a concrete Agy infrastructure error code.
- A Codex fallback is **not independent external verification** even when signed. Reports or UI must label it as internal AI cross-check/backup, not as third-party verification.
- The signer still requires a trusted local Ed25519 private key **outside** the repo. The Codex process is never given this key or Cloudflare/GitHub credentials.

### Fail-closed rules and tradeoffs

1. Agy returns PASS or PASS_WITH_P2: no Codex call.
2. Agy finds P0/P1 or uncovered P2: BLOCKED, no Codex call.
3. Agy fails before or during model review due to allowlisted infrastructure problems, with no findings or partial failed response: automatic full Codex retry in a new `codex exec --sandbox read-only --ephemeral` session.
4. Codex responses have schema and coverage checks, source IDs and P2 disclosure validations using the same Python routines as the primary Gemini review.
5. Codex error, malformed JSON, missing sources or critical findings: BLOCKED.
6. If the report later changes, its SHA-bound review and certificate cannot be reused.
7. The CLI needs a powered-on local machine; GitHub cloud runners cannot magically access the user's local Codex login. Configure a trusted Windows scheduler/runner separately if no human launch is desired.

## Required acceptance before enabling production

- Test `agy --version`, `agy models`, `codex --version`, `codex exec --help` locally.
- Force Agy unavailable and confirm a **real** Codex call produces strictly structured findings for a synthetic small research package with complete evidence.
- Confirm P1 and missing-evidence scenarios block; confirm signing rejects tampered provider and fallbackReason.
- Confirm `npm run research:check` and existing Report QC on at least one sample package.
- Keep pull requests in Draft and do not publish D1 until live failover and signed certificate verification are confirmed.

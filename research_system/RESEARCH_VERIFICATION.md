# Independent Research Verification

This system combines deterministic package checks, a local Agy Gemini 4 Argon review, and an Ed25519 certificate. A remote D1 import or Cloudflare release requires a valid certificate bound to the current package, report, policy, and verifier code.

## Local workflow

Install the pinned Python dependencies once:

```powershell
py -3 -m pip install --requirement requirements-verification.txt
```

Run deterministic validation:

```powershell
npm.cmd run research:verification -- validate umc-2303 --root .
```

`PASS` exits successfully. `NOT_VERIFIED` and `BLOCKED` exit nonzero. A missing original source or calculation input stays unverified; do not change it to a pass by filling in an assumption.

When all required evidence is available locally, run the independent review:

```powershell
npm.cmd run research:verification -- review <slug> --root . --evidence-dir research/<slug>/sources --model gemini-4-argon-high
```

If broker evidence must be checked by Gemini, explicitly add `--allow-private-source-review` to the local review command. This sends a local excerpt of each restricted source to Agy/Gemini. Confirm the source may be shared with that service before using the flag. The default keeps restricted sources out of model prompts and blocks the review. The excerpt is limited to 4,000 characters per source, so a passing review does not establish that every page of a long broker report was checked.

The detailed review record, including prompts, private excerpts when enabled, and model output, stays in the ignored `.research-verification/` directory. The public certificate contains hashes and counts only. The command does not write report data, a certificate, D1, or Cloudflare. Missing required evidence, restricted sources that were not authorized for external review, unavailable Agy/models, malformed model output, P0/P1, or an undisclosed P2 returns `BLOCKED`. P2 can pass only when the disclosure location resolves to supplied report text.

P1 findings include a concrete remediation recommendation, but this version does not fetch missing sources or edit the package automatically. It remains blocked until the package/evidence is corrected and validation plus review are rerun. P3 findings are recorded and do not block; automatic copy edits/re-review are not implemented. Do not describe either severity as automatically repaired.

## Signing key and public trust key

Create the Ed25519 private key outside the repository. This command writes the private PEM to a local file and prints only the public PEM:

```powershell
$privateKeyPath = Join-Path $env:USERPROFILE '.codex\keys\research-verification-ed25519.pem'
$publicKeyPath = Join-Path $env:TEMP 'research-verification-public.pem'
node .\scripts\research-certificate.mjs keygen --private-key $privateKeyPath | Set-Content -Encoding ascii $publicKeyPath
```

Keep the private key on the local machine. Do not add it to GitHub, the repository, the review record, or a workflow secret. Add the public PEM as a **repository variable** named `RESEARCH_VERIFICATION_PUBLIC_KEY`:

```powershell
$publicKey = Get-Content -Raw $publicKeyPath
gh variable set RESEARCH_VERIFICATION_PUBLIC_KEY --repo sarsadsl/research_report --body $publicKey
```

After a local review returns `PASS` or disclosed `PASS_WITH_P2`, sign that exact review record. Replace `<slug>` and `<package-hash>` with the values from the review output:

```powershell
$reviewPath = '.research-verification/<slug>/<package-hash>/gemini-review.json'
node .\scripts\research-certificate.mjs sign --root . --slug <slug> --review $reviewPath --private-key $privateKeyPath --evidence-dir research/<slug>/sources
node .\scripts\research-certificate.mjs verify --root . --slug <slug> --public-key $publicKeyPath
```

The public certificate is written to `research/<slug>/verification-certificate.json`. Commit that certificate with the corresponding report change. It contains hashes and review metadata, not source excerpts, prompts, model output, or private key material. A change to the package, report, verifier, policy, schema, release gate, or pinned dependencies invalidates the certificate and requires a new review and signature.

## CI and release gates

- Pull requests run the Python unit tests and existing Research Package checks, then verify signed certificates for changed packages/reports.
- The production workflow verifies the selected report certificate before generating Wrangler configuration or receiving Cloudflare credentials.
- `research:publish --remote` verifies the certificate after QC and before D1 import. Direct `research:import --remote` performs the same check before migrations or SQL execution.
- Local import and dry-run do not require a certificate because they do not write remote D1.
- The public key is read from `RESEARCH_VERIFICATION_PUBLIC_KEY`; missing or invalid configuration fails closed.

Signing requires a fresh deterministic `PASS` with required evidence available locally. CI may lack private/local source files; it accepts a signed certificate against the current package, report, policy, and verifier hashes only when its current result is `NOT_VERIFIED` solely because evidence is unavailable and it has no `BLOCKED` check. Any deterministic blocker still rejects the certificate.

Example remote commands, after evidence has passed review and a signed certificate is committed:

```powershell
$env:RESEARCH_VERIFICATION_PUBLIC_KEY = Get-Content -Raw $publicKeyPath
npm.cmd run research:publish -- <slug> --remote
```

The CLI and CI are designed to require no routine human review. P0/P1 findings, missing evidence, failed Gemini execution, stale certificates, or failed release checks remain blocked; no model can waive those conditions.

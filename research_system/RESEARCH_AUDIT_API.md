# D1 Research Audit API (read-only)

## Purpose

Private verification of the Cloudflare **remote D1** research records after an import. This is distinct from the public `/api/research` routes, which can fall back to seed fixtures when the D1 binding is absent.

- `GET /api/research/audit`: one row per D1 company, including the latest report, latest import run, recorded hashes, expected/observed counts, and discrepancies.
- `GET /api/research/audit?slug=vpec-2455`: the same audit, limited to one company.
- **No update, insert, delete, arbitrary SQL, CORS wildcard or fallback data.**

The audit endpoint is for an operator, **not a public web API**. It requires a bearer secret even if a Cloudflare Access application is additionally configured.

## Required Cloudflare secret

Create a cryptographically random token of at least 32 characters. On Windows PowerShell:

```powershell
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$token = ([Convert]::ToBase64String($bytes)).TrimEnd("=").Replace("+", "-").Replace("/", "_")
```

In a terminal with the correct authenticated Cloudflare account and the existing, verified `wrangler.jsonc`:

```powershell
npx.cmd wrangler secret put RESEARCH_AUDIT_TOKEN --config wrangler.jsonc
```

Paste `$token` when prompted **locally** (do not paste it into ChatGPT, GitHub, screenshots, query parameters, or a checked-in .env file). Keep a local password-manager copy for authorized clients. Use distinct credentials per environment and rotate if leaked. This secret is independent of `CLOUDFLARE_API_TOKEN`, and must never be the D1 access token.

The `RESEARCH_DB` D1 binding must also be present. No configuration, weak or missing secret, or missing D1 binding yields an error instead of an unauthenticated report.

For a second authorization perimeter, add a Cloudflare Access policy to this route/hostname; do not rely on an Access policy on a custom hostname alone if the Worker also has an unprotected `*.workers.dev` URL.

## Verification requests

```powershell
$headers = @{ Authorization = "Bearer $token" }
$base = "https://research-report.sarsadsl.workers.dev"
Invoke-RestMethod -Uri "$base/api/research/audit" -Headers $headers |
  ConvertTo-Json -Depth 12
Invoke-RestMethod -Uri "$base/api/research/audit?slug=vpec-2455" -Headers $headers |
  ConvertTo-Json -Depth 12
```

Expected behavior:
- Unauthenticated: **401**, not audit content.
- Missing/weak configured secret or missing D1: **503**, never seed data.
- Unknown slug: **404**; invalid slug: **400**.
- Valid request: `source: "cloudflare-d1"` and `companies[]` containing `METADATA_MATCH` or `REVIEW_REQUIRED`.
- Database query failure: **503** without SQL or credentials in the response.

Do not transmit the bearer token through a browser URL; normal browser address-bar navigation cannot add the Authorization header. Use the command above or another approved authenticated HTTP client.

## Interpretation

- `latestRun` includes `packageHash`, `sourceHash`, `seedHash`, `reportHash`, version, as-of date and imported-at time.
- `expectedRowCounts` is read from `research_runs.row_counts_json`, and `observedRowCounts` is queried from D1. Report sections and earnings-quality counts are scoped to the report matching the latest run's version.
- `issues` includes `NO_IMPORT_RUN`, `NO_PUBLISHED_REPORT`, `VERSION_MISMATCH`, `NO_IMPORTED_REPORT_HASH`, `RUN_NOT_IMPORTED`, `INVALID_EXPECTED_ROW_COUNTS`, and `ROW_COUNT_MISMATCH`.
- `METADATA_MATCH` **only means available metadata and row counts agree**, not that the underlying rows, financial facts, QC checks or live website bytes have been verified.
- `research_reports` may contain historical versions, so a count mismatch in that table can require interpretation.
- A `research_runs` record can be written before post-import validation finishes; the record's `imported` status is not conclusive evidence of successful end-to-end deployment.
- The import `reportHash` is not evidence that the currently deployed website HTML has identical bytes. Verify live report and API separately.
- The endpoint requires the `research_earnings_quality` table to be present; complete migrations first through the existing approved release process.

## Release checklist

1. Review the PR, run `npm test`, `npx tsc --noEmit`, and existing report QC.
2. Provision `RESEARCH_AUDIT_TOKEN` and confirm the correct `RESEARCH_DB` binding in the target Cloudflare environment.
3. Use the existing gated publish process; **do not bypass tests or publish an unreviewed research package** merely to enable this endpoint.
4. Verify 401/503 behavior and an authenticated read against remote D1.
5. Compare the returned run hashes with the canonical GitHub Research Package and deployment evidence. Record discrepancies instead of automatically rewriting D1.

This API intentionally performs no mutations or deployments.

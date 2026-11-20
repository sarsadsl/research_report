# Local Evidence Locator Harness Specification

## Objective

- User goal: retain usable paths from report source IDs to original evidence files, including files held in Google Drive, so local verification can be repeated.
- In scope: a local-only source locator manifest, relative path validation, Drive file ID metadata, SHA-256 pinning, HTML/PDF/text evidence extraction, and UMC-2303 proof of use.
- Explicitly out of scope: Google Drive writes, automatic Drive synchronization, uploading broker materials to Gemini, editing financial inputs or conclusions, changing D1, merging, or deployment.
- Definition of done: a source ID can be mapped to a repo-local evidence file; path traversal and changed files block validation; private Drive identifiers and source text remain out of public validation output; all verifier code and tests cover the behavior.

## Risk and authority

- Risk level: L2 (verification-gate code changes; no production mutation).
- Read paths: research/<slug>/research-package.json, allowed evidence directories, and Google Drive metadata for source discovery.
- Write paths: verifier code/tests/docs in this worktree; local maps under .research-verification/<slug>/source-locations.json.
- Permitted tools and commands: repository read/edit, Python unit tests, read-only Google Drive search/fetch, and local deterministic verification.
- Network and external systems: Google Drive is read-only; no other network access is required for locator registration.
- Credentials and redaction policy: no credentials are read or written. Drive file IDs, filenames, local paths, and restricted source text stay in the ignored local map/evidence directory and are excluded from public results.
- Human approval checkpoints: any external model review of restricted evidence still requires the existing explicit --allow-private-source-review option; no publication or production action is in scope.

## Context and control loop

- Startup map and sources of truth: package source IDs and evidence classifications are authoritative; the local locator map only resolves a source ID to a local copy and records its expected SHA-256.
- Execution model: deterministic single-agent implementation and verification; no agent may amend review records or certificates.
- Stop, retry, time, and cost budgets: one bounded Drive search per source, no repeated broad crawling, and no automatic retries that could send private material externally.
- Escalation condition and recipient: stop if a Drive result cannot be matched to an existing package source, if access classification is unclear, or if a source copy/hash conflicts. Ask the user before changing source classification or using private content externally.

## Verification

- Required end-state checks: manifest parser rejects unsafe paths and unknown source IDs; mapped files pass only at the registered SHA-256; tampering produces BLOCKED; generated public JSON contains no local path, Drive ID, Drive filename, or raw source text.
- Required CI or security gates: Python verifier unit tests, the existing research checks, and verifier code-hash binding must include locator code.
- Independent review method: inspect the complete diff and run UMC deterministic validation after mapping.
- Residual risks and accepted gaps: local maps are intentionally ignored by Git and are not portable to a fresh checkout; source files must remain in the listed local evidence folders. A saved copy proves file identity and availability, not that every claim is supported without claim-level source location checks.

## Local map format and supported paths

The map is written to .research-verification/<slug>/source-locations.json, which is ignored by Git. Each entry records a package sourceId, repo-relative path, raw-file sha256, access class, and optional Drive file ID/name. The validator binds the map file hash into evidenceHash, verifies each mapped file against its expected SHA-256, and never serializes the path or Drive metadata in public validation results.

Allowed local evidence roots are:

- research/<slug>/sources/ for public or licensed local source files.
- research/<slug>/restricted/ for private or broker source files; this directory is Git-ignored.
- .research-verification/<slug>/evidence/ for local-only source snapshots.

Paths must be relative to the repository and use forward slashes. Absolute paths, parent traversal, unsupported extensions, symlinks escaping an allowed root, and hash mismatches are rejected. Supported files are PDF, HTML, Markdown, and UTF-8 text.

Register a file after saving it to an allowed evidence folder:

~~~powershell
py -3 -m verification map-source '<slug>' --source-id '<package-source-id>' --path 'research/<slug>/sources/<filename>.pdf' --access public --drive-file-id '<optional-drive-file-id>' --drive-name '<optional-drive-filename>'
~~~

For restricted research, use --access restricted and keep the file under research/<slug>/restricted/. The local map is never added to Git, and restricted/internal originals must stay out of Git. Commit a public original only when its license and repository policy allow it; otherwise keep a local copy under .research-verification/<slug>/evidence/. Re-running validate checks the file against its recorded hash. A changed source requires an explicit remap, which changes the evidence hash and invalidates any earlier certificate.

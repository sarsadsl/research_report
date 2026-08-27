# P1 — Research Publishing System Roadmap

## Goal

Turn the current 2455 reference implementation into a repeatable publishing system:

```text
Sources -> Research Package -> Validate -> D1 -> Dashboard + Full Report -> QC -> Deploy + Standalone HTML
```

The Research Package is the only authored data source. D1 rows, website views, full reports, and exported artifacts are derived outputs.

## Delivery rules

- Work directly on `main` using small, reversible commits.
- Preserve the current 2455 report as a visual and content regression reference until the generic renderer passes.
- Every phase has a Definition of Done. Do not begin the next phase while its blocking checks fail.
- Data correctness > no overlap/clipping > readability > visual quality > fewer pages.
- Standalone exports are build artifacts and must not be committed to GitHub.
- Official facts, third-party facts, market consensus, and research inference must remain distinguishable.

## Phases

### P1.0 — Contracts and quality gates

Deliver:
- `RESEARCH_WORKFLOW.md`
- `RESEARCH_DATA_SCHEMA.md`
- `RESEARCH_STYLE_GUIDE.md`
- `RESEARCH_QC.md`
- this roadmap

Done when:
- Inputs, canonical source, outputs, lifecycle, and stop conditions are explicit.
- The legacy 2455 HTML pipeline is documented as temporary.

### P1.1 — Research Package foundation

Deliver:
- `research/<slug>/manifest.json`
- `research/<slug>/research-package.json`
- machine-readable JSON Schema and TypeScript types
- 2455 reference package migrated from the current seed/report

Done when:
- A validator accepts the 2455 package.
- Every authored fact has a classification and source reference.
- No renderer or D1 mutation is introduced yet.

### P1.2 — Validator and D1 importer

Deliver:
- package validation CLI
- idempotent D1 importer
- package-to-fallback-data generator
- consistency tests

Done when:
- `seed.ts` and `db/seed/2455.sql` are generated from the package, not independently edited.
- Re-importing the same package is safe.
- Invalid references, duplicate IDs, invalid periods, and missing sources fail before database writes.

### P1.3 — Generic Dashboard renderer

Deliver:
- company-neutral dashboard view model
- manifest-driven KPI, chart, table, signal, risk, and catalyst sections
- removal of hard-coded 2455 baseline numbers and fixed 2026/2027 assumptions

Done when:
- Current 2455 dashboard content is reproduced from the package.
- Dashboard numbers equal imported D1 numbers.
- Desktop and mobile smoke tests pass.

### P1.4 — Generic Full Report renderer

Deliver:
- section component registry
- `/research/reports/[slug]`
- report sections rendered from the same package/view model as the dashboard
- retirement plan for v4 compressed HTML and v7 company-specific patches

Done when:
- 2455 content and visual hierarchy match the accepted reference.
- No company title or section name is hard-coded in pagination logic.
- Report page count is content-driven.

### P1.5 — Standalone exporter and layout QC

Deliver:
- browser-based exporter
- frozen, self-contained HTML with inlined required assets
- overflow, overlap, clipping, missing-source, desktop, mobile, and offline load checks

Done when:
- `npm run research:validate -- <slug>` fails on any blocking defect.
- `npm run research:export -- <slug>` creates an offline-loadable artifact.
- Standalone HTML is not tracked by Git.

### P1.6 — Versioned one-command publishing

Deliver:
- `research_runs` and artifact/source linkage migrations
- package/source/report hashes
- draft -> review -> published -> archived enforcement
- `npm run research:publish -- <slug>`

Done when:
- A publish run is traceable and atomic.
- Failed QC cannot mark a run published.
- The command reports URLs, version, hashes, page count, and QC results.

### P1.7 — Generalization proof

Deliver:
- a second company with meaningfully different KPIs/sections
- regression suite for 2455
- updated operation manual

Done when:
- The second company is added without copying a report implementation.
- Both companies pass the same package, renderer, exporter, and QC pipeline.

## Legacy boundary

Until P1.4 passes, these remain reference-only legacy inputs:

- `report_sources/vpec-2455.v4.*`
- `report_sources/vpec-layout-v*.css`
- `report_sources/vpec-layout-v*.js`
- `scripts/materialize-reports.mjs`
- tracked `public/research/reports/vpec-2455.html`

Do not add new companies to this legacy path.

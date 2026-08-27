# Research Workflow

## Purpose

This is the required SOP for creating or updating company research.

## Inputs

Accepted inputs include:
- company filings, MOPS data, investor presentations, earnings calls, and official announcements;
- exchange and third-party factual datasets;
- market research used for consensus or scenarios;
- analyst notes and explicit research assumptions.

## Evidence classes

Every factual input or derived claim must use one class:

1. `official` — company, regulator, exchange, audited or formally filed information.
2. `third_party_fact` — factual dataset from a named provider.
3. `market_consensus` — attributed or aggregated market forecasts.
4. `research_inference` — calculation, estimate, scenario, sensitivity, or analyst judgment.

A research inference must identify its inputs and method. It must never be presented as an official disclosure.

## Canonical flow

1. Define company, slug, as-of date, scope, and required outputs.
2. Collect and register sources before adding claims.
3. Extract facts and preserve units, periods, currency, and evidence class.
4. Add calculations and assumptions as research inference.
5. Build or update `research/<slug>/research-package.json`.
6. Validate schema, IDs, references, units, periods, source coverage, and calculations.
7. Import the validated package into D1 using an idempotent transaction.
8. Render Dashboard and Full Report from the same validated view model.
9. Run content and layout QC on desktop and mobile.
10. Export and offline-load-test standalone HTML.
11. Record hashes and QC result in a research run.
12. Publish only after all blocking checks pass.

## Lifecycle

- `draft`: incomplete or actively edited; never public.
- `review`: data and narrative ready for verification; never the public default.
- `published`: passed blocking QC and is eligible for public routes.
- `archived`: retained for history and not the current default.

Updates create a new research version. Published history is not silently overwritten.

## Required outputs

A publishable manifest may request:
- D1 import;
- Dashboard;
- Full Report;
- standalone HTML;
- optional PDF in a later phase.

Requested outputs are obligations, not suggestions.

## Stop conditions

Publishing must stop when any of the following occurs:
- invalid package schema or unresolved source reference;
- conflicting canonical values for the same metric/period/scenario;
- official and estimated data are mixed without labels;
- missing required source, unit, period, as-of date, or methodology;
- renderer overflow, overlap, clipping, missing section, or runtime error;
- desktop, mobile, standalone, or offline load failure;
- D1 import or hash verification failure.

## Handoff report

Every completed publish must report:
- research conclusion;
- package/report version and as-of date;
- added or changed data;
- evidence class and sources;
- D1 import result;
- Dashboard and Full Report URLs;
- standalone artifact;
- page count and QC summary;
- commit and deployment result;
- known non-blocking limitations.

# Research Data Contract

P1.10 clarification: this file defines the data contract. Full Report now renders directly from package sections; hash conventions and operational limitations are documented in [Workflow](RESEARCH_WORKFLOW.md) and [QC](RESEARCH_QC.md).

## Canonical package

The canonical authored record is:

```text
research/<slug>/manifest.json
research/<slug>/research-package.json
research/<slug>/report-profiles.json
research/<slug>/notes.md
```

D1, fallback fixtures, dashboards, reports, and exports are derived from it.

## Package envelope

A package must contain:

- `schemaVersion`
- `packageVersion`
- `asOfDate`
- `company`
- `report`
- `thesis`
- `dashboard`
- `actuals`
- `monthlyRevenue`
- `segments`
- `forecasts`
- `capacity`
- `catalysts`
- `risks`
- `signalRules`
- `signalSnapshots`
- `sections`
- `sources`
- `claims`

Optional arrays are represented as empty arrays, not omitted, so completeness can be validated consistently.

## Manifest

The manifest controls outputs and quality requirements, not research values.

Minimum fields:

```json
{
  "schemaVersion": "1.0.0",
  "ticker": "2455",
  "market": "TW",
  "slug": "vpec-2455",
  "reportVersion": "1.0.0",
  "output": {
    "dashboard": true,
    "fullReport": true,
    "standalone": true
  },
  "quality": {
    "checkOverflow": true,
    "checkOverlap": true,
    "checkSources": true,
    "desktopTest": true,
    "mobileTest": true,
    "offlineStandaloneTest": true
  }
}
```

## Source record

A source requires:
- stable `id`;
- `evidenceClass`: `official | third_party_fact | market_consensus | research_inference`;
- provider and title;
- URL or repository-local attachment reference where applicable;
- published date when known;
- accessed date;
- covered periods;
- confidence;
- notes.

URLs and filenames are metadata. They do not prove that a claim is linked to the source.

## Claim and provenance

Every material number or conclusion must have a stable claim ID with:
- evidence class;
- source IDs;
- covered period;
- unit and currency when numeric;
- method and input claim IDs for research inference;
- confidence and notes.

Structured rows such as actuals, monthly revenue, forecasts, and segments reference claim/source IDs. A renderer must be able to show the source behind a displayed value.

## Units and periods

- Monetary values declare currency and scale; never infer whether a value means TWD, thousands, millions, or billions.
- Ratios use one canonical representation defined by the machine schema.
- Dates use ISO 8601.
- Fiscal periods are explicit and separate from calendar dates.
- Forecast scenarios use stable IDs; labels are presentational.
- Estimates carry `isEstimate: true` and evidence class `research_inference` or `market_consensus`.

## Sections

Sections are ordered renderer instructions. Each section has:
- stable ID and type;
- title and optional subtitle;
- payload references rather than duplicated research values;
- optional display configuration;
- required source visibility.

Initial generic section types:
- summary
- kpi-grid
- financial-table
- bar-chart
- line-chart
- bridge
- scenario-table
- capacity
- signals
- catalysts-risks
- sources
- conclusion

Unknown section types fail validation until supported explicitly.

## Identity and integrity

- IDs are stable across non-semantic formatting changes.
- Package hashes use canonical JSON serialization.
- Target: derived artifacts record the canonical package hash used to create them. Currently the importer stores a canonical package hash, while the exporter prints a hash of raw package file text; these are not interchangeable (see Workflow).
- Duplicate company/period/metric/scenario keys fail validation.
- A package cannot publish with dangling source, claim, or section references.

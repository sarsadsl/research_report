# Research Quality Control

## Result model

Each check returns:
- `PASS`
- `FAIL` — blocks import, publish, deploy, or export
- `WARN` — recorded but does not block

A publish result is PASS only when every blocking check passes.

## Package checks

Blocking:
- schema and supported schema version;
- manifest/package company identity match;
- unique stable IDs and composite keys;
- valid dates, periods, scenarios, units, and currency scale;
- no dangling source, claim, input-claim, or section references;
- required arrays and requested outputs present;
- official/estimate classification is explicit;
- research inference contains method and inputs;
- canonical package hash can be reproduced.

## Data checks

Blocking:
- duplicate or conflicting canonical values;
- invalid percentage/range relationships;
- segment shares outside allowed tolerance;
- scenario ordering violations when an ordering rule is declared;
- displayed KPI cannot be traced to a source/claim;
- Dashboard and Full Report values disagree for the same claim;
- D1 import result differs from the package.

Warnings:
- stale source by configured freshness policy;
- medium/low confidence source used for a prominent conclusion;
- missing optional comparison period.

## Renderer checks

Blocking:
- missing requested section, table, chart, or source label;
- JavaScript/runtime error;
- page count is zero;
- content overflow beyond tolerance;
- top-level visual overlap;
- clipping outside the page/viewport;
- unreadable scale or hidden essential content;
- broken navigation or zoom;
- inaccessible status meaning.

## Viewports

At minimum:
- desktop report viewport;
- common laptop viewport;
- mobile portrait viewport.

All blocking checks run at every required viewport declared by the manifest.

## Standalone checks

Blocking:
- exported file is empty or hash is missing;
- required external network request;
- local file load failure;
- different material content from the website report;
- navigation, zoom, charts, or tables fail after export;
- runtime pagination remains unfinished;
- debug or obsolete layout scripts remain active.

## Required machine-readable summary

```text
Research: <company> <ticker>
Package: <version> <hash>
Database: PASS|FAIL
Claims/Sources: PASS|FAIL
Dashboard: PASS|FAIL
Full Report: PASS|FAIL
Pages: <count>
Overflow: <count>
Overlap: <count>
Clipping: <count>
Desktop: PASS|FAIL
Mobile: PASS|FAIL
Standalone: PASS|FAIL
Result: READY_TO_PUBLISH|BLOCKED
```

## CI gate

The publish/deploy workflow must call the validator before D1 mutation and call renderer/export QC before marking a version published. A failed blocking check exits non-zero and prevents deployment of that research version.

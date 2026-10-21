# VPEC 2455 package migration notes

## 2026-10-21 public update (report 1.3)

- Added September revenue: TWD 449.063 million; official-announcement republication gives January–September TWD 3,266.756 million. Earlier rounded monthly inputs are preserved; exact cumulative disclosures take precedence over rounded historical sums.
- Recomputed MoM from raw August/September amounts: approximately -4.64%, versus the republication's -4.63% rounding difference; commentary uses approximately -4.6%.
- Added the public call notices for VPEC II/III (October 19–November 17; scheduled OTC termination November 18). A call notice does not establish that every bond converted.
- Q3 profitability, September product mix and conversion-adjusted weighted shares remain unverified. Actual financials, scenario numbers and signal thresholds remain unchanged pending new evidence.
- The original-format baseline remains a historical comparison; the public full-research template is the current report.

This directory is the P1 reference package. It does not drive production routes yet.

## Current status

- Values were migrated from `lib/research/seed.ts` and `db/seed/2455.sql`.
- The package adds explicit units, evidence classes, source IDs, and claim metadata that the P0 structures do not contain.
- Existing P0 seed files remain authoritative for runtime until P1.2 generates them from this package.
- The legacy full report remains the visual/content regression reference until P1.4.

## Known normalization decisions

- Monetary statement and forecast values use TWD millions.
- Monthly revenue uses Goodinfo as `third_party_fact`.
- The July 2026 optoelectronics share/revenue row is marked `research_inference`.
- Consensus rows use `market_consensus`; proprietary bull scenarios use `research_inference`.
- The report version remains 1.1 while the package contract begins at 1.0.0.

## P1.2 checks to add

- JSON Schema validation with date-format support.
- Stable ID and composite-key uniqueness.
- source/claim/section reference resolution.
- segment-share tolerance.
- manifest/package identity and output obligation checks.
- generated fallback TypeScript and D1 seed equivalence.


## P1.2 generation contract

The package now generates both runtime fallback data and D1 seed SQL.

```bash
npm run research:validate -- vpec-2455
npm run research:generate -- vpec-2455
npm run research:check
npm run research:import -- vpec-2455 --local
```

Generated outputs must be committed and must pass `research:generate --check` in CI. Remote import requires an explicit `--remote` flag.


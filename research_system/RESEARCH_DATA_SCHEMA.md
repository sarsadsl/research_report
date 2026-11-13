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

## EQ-01 盈餘品質資料契約（工程分支已實作）

參見 [EQ-01](RESEARCH_EARNINGS_QUALITY.md)。`research-package-v1.schema.json` 現在允許根層 **optional** `earningsQuality`；既有 2026-11-13 前歷史 package 維持原樣。對已發布的 `fullReport`，若 `asOfDate` 或 `report.publishedAt` 不早於 2026-11-13，則由 Validator 強制要求 EQ-01，不得省略或以 `NOT_RUN` 通過。

必備欄位與型別（數值未知用 `null` 並說明，不能填 0）：

| 位置 | 欄位 | 語意 |
| --- | --- | --- |
| `earningsQuality` | `standard=EQ-01-v1`、`reviewStatus`、`reviewer`、`reviewedAt`、`coverageNote`、`notes` | 審閱人／日期、完整性缺口 |
| `periods[]` | `id`、`period`、`periodType`（quarter／annual／ytd）、`currency`、`scale` | 逐期分類與貨幣；至少近三年與最近四季，缺漏需註記 |
| `periods[]` | `revenue`、`operatingIncome`、`nonOperatingNet`、`pretaxIncome`、`incomeTax`、`netIncomeAttributable` | 法定損益勾稽所需輸入 |
| `periods[]` | `reportedEps`、`normalizedEps`、`weightedAverageShares`、`shareholdersEquity`、`normalizationNote` | 法定／正常化 EPS、股數與淨值；缺值註記 |
| `periods[].adjustments[]` | `id`、`category`、`realization`、`pretaxAmount`、`epsImpact`、`equityImpact`、`method`、`notes` | 每筆特殊損益：`epsImpact` 是**對法定 EPS 的有號影響**，因此正常化 EPS = 法定 EPS − Σ EPS impact |
| 證據 | `periods[].sourceIds`、`periods[].claimIds`、`adjustments[].sourceIds`／`claimIds` | 必須引用 package `sources`／`claims` 的有效 ID |
| L2 | `qualitativeFlags`、`l2.status`／`summary`／`sourceIds`／`claimIds` | 自動觸發 + 人工完成底層投資穿透 |
| 估值 | `valuation.epsBasis`、`valuation.doubleCountChecked`、`valuation.notes` | 確認 P/E 的 EPS 口徑及避免重複扣除 |

- 帳面金額的 `scale` 指報告金額之倍率；`weightedAverageShares` 必須在 `normalizationNote` 中註明分母股數單位，避免調節單位不一致。
- `epsImpact` 與稅、非控制權益須使用**歸母稅後**效果計算；無法可靠計算則填 `null` 並說明，不可猜測。
- 引擎將對 `operatingIncome + nonOperatingNet ≈ pretaxIncome`、正常化 EPS 等式、重大比率與 L2 阻擋條件進行檢查。真實性與底層持股／稅務的完整核對仍是人工 QC。
- 保存：D1 migration `0003_research_earnings_quality.sql` 按 `report_id` 儲存完整 `payload_json`；`research_runs` 只記錄 rowCounts/hash，**不代表已人工覆核每個值**。
- 顯示：`full-research` 對 L1 無重大異常僅增加摘要；L2 被觸發時增一頁專題。其 `report-profiles.json` 可省略 `expectedPages` 或設為正確頁數；不要把原有固定 14 頁硬套於所有新公司。
- 生效前既有 published package、舊 schemaVersion `1.0.0` 與 generated files 不直接覆寫。工程分支尚待測試、人工驗收與合併後才會在正式 D1／網站生效。

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

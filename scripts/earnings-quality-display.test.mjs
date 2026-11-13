import assert from "node:assert/strict";
import test from "node:test";
import {
  readerEarningsAlerts,
  readerEarningsLabel,
  readerInvestmentBasis,
  readerAdjustmentCategory,
  readerRealization,
  readerPeriod,
} from "./earnings-quality-display.mjs";

test("reader labels never expose internal audit codes", () => {
  const eq={
    periods:[
      {period:"2026Q1",nonOperatingNet:5367,pretaxIncome:16643},
      {period:"2026Q2",nonOperatingNet:30236,pretaxIncome:45186},
      {period:"2026YTD",nonOperatingNet:36871.951,pretaxIncome:81740.885},
    ]
  };
  const alerts=readerEarningsAlerts([
    "NON_OPERATING_SHARE:2026Q1",
    "NON_OPERATING_SHARE:2026Q2",
    "NON_OPERATING_SHARE:2026YTD",
    "NON_OPERATING_VOLATILITY:2026Q2",
    "NON_OPERATING_VOLATILITY:2026Q3",
    "UNREALIZED_SHARE:2026YTD",
    "QUALITATIVE:cross_holding",
    "QUALITATIVE:spv",
    "QUALITATIVE:accounting_policy_difference",
  ],eq);
  const copy=alerts.join("\n");
  assert.equal(alerts.length,6);
  assert.match(copy,/業外損益占稅前獲利比重偏高/);
  assert.match(copy,/2026年第1季 32\.2%/);
  assert.match(copy,/2026年第2季 66\.9%/);
  assert.match(copy,/2026年累計 45\.1%/);
  assert.match(copy,/關聯企業持有本公司股票/);
  assert.match(copy,/特殊投資|投資公司/);
  assert.doesNotMatch(copy,/EQ-01|NON_OPERATING|QUALITATIVE|UNREALIZED|L[12]|cross_holding|spv/);
});

test("reader labels describe every quantitative and qualitative trigger", () => {
  const cases=[
    "NON_OPERATING_SHARE:2026Q1",
    "NEAR_ZERO_PRETAX:2026Q1",
    "EQUITY_IMPACT:2026Q1",
    "EPS_IMPACT:2026Q1",
    "UNREALIZED_SHARE:2026Q1",
    "NON_OPERATING_VOLATILITY:2026Q1",
    "QUALITATIVE:control_scope",
    "QUALITATIVE:related_party",
    "QUALITATIVE:restatement",
    "QUALITATIVE:estimate_change",
    "QUALITATIVE:forecast_discrepancy",
    "QUALITATIVE:other"
  ];
  const labels=readerEarningsAlerts(cases,{periods:[{period:"2026Q1",nonOperatingNet:20,pretaxIncome:100}]});
  assert.equal(labels.length,cases.length);
  assert.ok(labels.every(label=>label.length>=12));
  assert.ok(labels.every(label=>!/(?:[A-Z_]{5,}|QUALITATIVE|EQ-01)/.test(label)));
});
test("reader status and financial labels use plain Chinese while preserving meaning", () => {
  assert.equal(readerEarningsLabel("WARN",true),"部分影響仍待核對");
  assert.equal(readerEarningsLabel("PASS",false),"未見重大異常");
  assert.match(readerInvestmentBasis("normalized",true),/未來獲利採正常化預測/);
  assert.match(readerAdjustmentCategory("equity_method"),/關聯企業投資收益/);
  assert.equal(readerRealization("unrealized"),"尚未實現");
  assert.equal(readerPeriod("2026Q3"),"2026年第3季");
});

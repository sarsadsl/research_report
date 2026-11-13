// Reader-facing copy only. EQ-01 identifiers remain stable in validators and D1.
const qualitativeLabels = {
  cross_holding: "關聯企業持有本公司股票，股價漲跌可能影響帳面投資收益",
  spv: "透過投資公司間接持股，需確認實際持股結構與收益來源",
  control_scope: "被投資公司的實際控制權與財報合併範圍需要釐清",
  related_party: "涉及關係人交易，需確認交易條件與收益來源",
  accounting_policy_difference: "不同財報編製規則可能造成收益與股東權益的呈現差異",
  restatement: "財報曾重新編製，須確認數字更動對獲利的影響",
  estimate_change: "重大會計估計變更可能改變帳面獲利",
  forecast_discrepancy: "財報業外收益與市場預估差距較大",
  other: "另有需要查閱財報附註的特殊事項",
};

const moneyCategories = {
  equity_method: "關聯企業投資收益（權益法）",
  FVPL: "金融投資市價評價（影響當期損益）",
  FVOCI: "金融投資市價評價（列其他綜合損益）",
  disposal: "資產或投資處分收益",
  dividend: "股利收入",
  fx: "匯率變動損益",
  interest: "利息收支",
  other: "其他特殊損益",
};

const realizationLabels = {
  realized: "已實現",
  unrealized: "尚未實現",
  mixed: "部分已實現",
  not_applicable: "不適用",
};

export const readerEarningsLabel = (reviewStatus, alert) => {
  if (reviewStatus === "WARN") return "部分影響仍待核對";
  if (reviewStatus === "FAIL") return "資料需補充查證";
  if (reviewStatus === "NOT_RUN") return "尚未完成檢查";
  return alert ? "主要項目已核對" : "未見重大異常";
};

export const readerEarningsReviewLabel = (reviewStatus) => {
  if (reviewStatus === "PASS") return "主要項目已完成核對";
  if (reviewStatus === "WARN") return "部分細項仍待核對";
  if (reviewStatus === "FAIL") return "仍有重要資料需補齊";
  return "尚未完成檢查";
};

export const readerInvestmentBasis = (basis, prospectiveOnly = false) => {
  if (basis === "normalized") return prospectiveOnly
    ? "未來獲利採正常化預測，不直接套用含特殊收益的歷史每股盈餘"
    : "採剔除特殊收益後的每股盈餘估值";
  if (basis === "reported") return "採財報揭露的每股盈餘估值，需留意業外收益";
  if (basis === "cash_flow") return "採現金流量估值，不把帳面評價利益當現金";
  return "此處未直接採用每股盈餘估值";
};

export const readerAdjustmentCategory = code => moneyCategories[code] ?? "其他特殊損益";
export const readerRealization = code => realizationLabels[code] ?? "性質待確認";

export const readerPeriod = value => {
  const quarter = /^(\d{4})Q([1-4])$/.exec(value);
  if (quarter) return quarter[1] + "年第" + quarter[2] + "季";
  const ytd = /^(\d{4})YTD$/.exec(value);
  if (ytd) return ytd[1] + "年累計";
  const annual = /^(\d{4})(?:FY|A)$/.exec(value);
  if (annual) return annual[1] + "全年";
  return value;
};

const safeRatio = (numerator, denominator) => 
  typeof numerator === "number" && Number.isFinite(numerator) &&
  typeof denominator === "number" && Number.isFinite(denominator) && Math.abs(denominator) > 1e-8
    ? Math.abs(numerator / denominator) * 100 : null;

const formatPct = value => value == null ? "待核對" : value.toFixed(1) + "%";

export function readerEarningsAlerts(reasons, eq) {
  const groups = new Map();
  for (const reason of reasons ?? []) {
    const splitAt = reason.indexOf(":");
    if (splitAt < 0) continue;
    const code = reason.slice(0, splitAt), value = reason.slice(splitAt + 1);
    if (!groups.has(code)) groups.set(code, []);
    if (!groups.get(code).includes(value)) groups.get(code).push(value);
  }
  const rows = new Map((eq?.periods ?? []).map(row => [row.period, row]));
  const periods = values => values.map(readerPeriod).join("、");
  const out = [];
  const share = groups.get("NON_OPERATING_SHARE");
  if (share?.length) {
    const detail = share.map(period => {
      const row = rows.get(period);
      const ratio = safeRatio(row?.nonOperatingNet, row?.pretaxIncome);
      return readerPeriod(period) + " " + formatPct(ratio);
    });
    out.push("業外損益占稅前獲利比重偏高：" + detail.join("、") + "；單季達15%或全年／累計達10%就應深入檢查");
  }
  const volatility = groups.get("NON_OPERATING_VOLATILITY");
  if (volatility?.length) out.push("業外損益短期波動很大：" + periods(volatility) + "，與前一期相比變動逾50%，且金額具重要性");
  const unrealized = groups.get("UNREALIZED_SHARE");
  if (unrealized?.length) out.push("未實現投資評價金額偏大：" + periods(unrealized) + "，估算金額至少占稅前獲利5%；需確認是否真正變現");
  const eps = groups.get("EPS_IMPACT");
  if (eps?.length) out.push("特殊收益或損失對每股盈餘影響顯著：" + periods(eps) + "，推估變動達10%以上");
  const equity = groups.get("EQUITY_IMPACT");
  if (equity?.length) out.push("特殊投資或市價變動可能影響股東權益：" + periods(equity) + "，估算影響達5%以上");
  const nearZero = groups.get("NEAR_ZERO_PRETAX");
  if (nearZero?.length) out.push("稅前獲利接近零：" + periods(nearZero) + "，比率容易失真，改以絕對金額與現金流檢查");
  const flags = groups.get("QUALITATIVE");
  if (flags?.length) for (const flag of flags) out.push(qualitativeLabels[flag] ?? "存在需要進一步確認的會計或投資結構");
  return out.length ? out : ["主要財報項目未達重大業外異常門檻"];
}

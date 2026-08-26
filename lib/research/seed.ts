import type { ResearchDetail } from "./types";

export const vpecSeed: ResearchDetail = {
  company: {
    id: "vpec-2455",
    ticker: "2455",
    market: "TW",
    name: "全新光電",
    slug: "vpec-2455",
    sector: "半導體",
    industry: "化合物半導體 / 光通訊",
    currency: "TWD",
    description: "聚焦 III-V 化合物半導體磊晶，研究主軸為 AI 光通訊帶動光電子占比提升。",
  },
  actuals: [
    { id: "25q4", companyId: "vpec-2455", period: "2025Q4", fiscalYear: 2025, quarter: 4, revenue: 959.6, grossProfit: 357.6, grossMargin: 37.27, operatingIncome: 209, operatingMargin: 21.78, netIncome: 194, netMargin: 20.22, eps: 1.05 },
    { id: "26q1", companyId: "vpec-2455", period: "2026Q1", fiscalYear: 2026, quarter: 1, revenue: 959.3, grossProfit: 365.4, grossMargin: 38.09, operatingIncome: 226.7, operatingMargin: 23.63, netIncome: 195.1, netMargin: 20.34, eps: 1.06 },
    { id: "26q2", companyId: "vpec-2455", period: "2026Q2", fiscalYear: 2026, quarter: 2, revenue: 965.4, grossProfit: 372.7, grossMargin: 38.61, operatingIncome: 223.8, operatingMargin: 23.18, netIncome: 213.6, netMargin: 22.13, eps: 1.15 },
  ],
  monthlyRevenue: [{ year: 2026, month: 7, revenue: 422.1, mom: 29.48, yoy: 45.12 }],
  segments: [
    { period: "2025Q4", segment: "微電子", revenue: 678.4, share: 70.7, isEstimate: false },
    { period: "2025Q4", segment: "光電子", revenue: 281.2, share: 29.3, isEstimate: false },
    { period: "2026Q1", segment: "微電子", revenue: 718.0, share: 74.9, isEstimate: false },
    { period: "2026Q1", segment: "光電子", revenue: 241.3, share: 25.1, isEstimate: false },
    { period: "2026Q2", segment: "微電子", revenue: 703.7, share: 72.9, isEstimate: false },
    { period: "2026Q2", segment: "光電子", revenue: 261.7, share: 27.1, isEstimate: false },
    { period: "2026/07", segment: "光電子", revenue: 168.8, share: 40, isEstimate: true },
  ],
  forecasts: [
    { fiscalYear: 2026, scenario: "bear", revenue: 4197, grossMargin: 39.03, netIncome: 889, eps: 4.76, optoShare: 35.0, notes: "市場區間低端" },
    { fiscalYear: 2026, scenario: "consensus", revenue: 4470, grossMargin: 40.6, netIncome: 1026, eps: 5.55, optoShare: 35.8, notes: "市場模型中位數" },
    { fiscalYear: 2026, scenario: "bull", revenue: 4581, grossMargin: 40.3, netIncome: 1071, eps: 5.73, notes: "投顧自研樂觀情境" },
    { fiscalYear: 2027, scenario: "bear", revenue: 4946, grossMargin: 40.59, eps: 6.19, optoShare: 43.3, notes: "市場區間低端" },
    { fiscalYear: 2027, scenario: "consensus", revenue: 5870, grossMargin: 44.8, eps: 8.55, optoShare: 51.0, notes: "市場模型中位數" },
    { fiscalYear: 2027, scenario: "bull", revenue: 6943, grossMargin: 45.62, eps: 11.02, optoShare: 50.1, notes: "光電子 >50%；50.1 僅作展示" },
  ],
  signals: [
    { asOfDate: "2026-08-26", metric: "月營收", status: "green", valueText: "2026/07 4.22 億", notes: "單月創高，仍需後續月份延續" },
    { asOfDate: "2026-08-26", metric: "光電子占比", status: "green", valueText: "2026/07 研究估計 >40%", notes: "非官方 segment disclosure" },
    { asOfDate: "2026-08-26", metric: "毛利率", status: "yellow", valueText: "26Q2 38.61%", notes: "仍需 H2 站穩 40% 以上" },
    { asOfDate: "2026-08-26", metric: "InP 供應", status: "yellow", valueText: "供應改善中", notes: "仍需觀察供應連續性" },
    { asOfDate: "2026-08-26", metric: "MOCVD utilization", status: "yellow", valueText: "新機 ramp 待驗證", notes: "設備到位不等於有效產能" },
    { asOfDate: "2026-08-26", metric: "新產品", status: "green", valueText: "200G PD / CW Laser 放量訊號", notes: "需確認營收貢獻持續擴大" },
  ],
  capacity: [
    { label: "公司揭露現有 MOCVD 基準", equipment: "MOCVD", technology: "mixed", deltaUnits: 0, baseUnits: 62, status: "actual", notes: "現有約 62 台。" },
    { label: "第一階段擴產 +5 台", equipment: "MOCVD", technology: "4 InP + 1 GaN", deltaUnits: 5, baseUnits: 62, expectedOnlineDate: "2026-2027", status: "ramping", notes: "gross tool count 約 +8.1%。" },
    { label: "最新累計規劃 +7 台", equipment: "MOCVD", technology: "6 InP + 1 GaN", deltaUnits: 7, baseUnits: 62, expectedOnlineDate: "2028", status: "planned", notes: "全部到位後相對 62 台約 +11.3%。" },
  ],
  catalysts: [
    { title: "InP 基板供應改善", impact: "high", status: "watch", notes: "可釋放既有設備與新機 utilization。" },
    { title: "200G PD 放量", impact: "high", status: "active", notes: "Data Center receive-side 新一代產品。" },
    { title: "CW Laser / 發射端產品", impact: "high", status: "watch", notes: "若轉為可見營收，可提高 ASP 與 mix。" },
  ],
  risks: [
    { title: "InP 原料 / 出口許可再度受阻", impact: "high", probability: "medium", status: "watch", notes: "可能再次壓抑光電子出貨。" },
    { title: "光電子占比未如期提升", impact: "high", probability: "medium", status: "watch", notes: "2027 模型對 mix 高度敏感。" },
    { title: "新機與新產品 ramp 延遲", impact: "medium", probability: "medium", status: "watch", notes: "折舊可能先於營收。" },
  ],
  reports: [
    { id: "vpec-report-v1", title: "全新光電 2455｜2025Q4-2027F 深度研究", slug: "vpec-2455", summary: "已實現財報、光電子 mix、2026F/2027F、產能與紅綠燈。", thesis: "InP 供應 → utilization → 光電子營收 → mix → GM → OP margin → EPS。", status: "published", version: "1.0", htmlPath: "/research/reports/vpec-2455.html", pdfPath: null, publishedAt: "2026-08-26" },
  ],
};

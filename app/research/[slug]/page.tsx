import Link from "next/link";
import { notFound } from "next/navigation";
import { formatSignalLabel } from "@/lib/research/calculations";
import { buildResearchDashboard } from "@/lib/research/dashboard";
import { getResearchRepository } from "@/lib/research/repository";
import {
  getIndustryLabel,
  getSketchVariant,
  HandDrawnUnderline,
  IndustryTag,
  MarkerHighlight,
  PaperSection,
  ResearchChart,
  ResearchChecklist,
  ResearchMetric,
  ResearchNote,
  ResearchSketch,
  ResearchStatus,
  ResearchTable,
  RiskNote,
  StickyNote,
  ThesisChain,
} from "../components/research-notebook";
import { ResearchNavigation } from "../research-client";

export const dynamic = "force-dynamic";

const fmt = (value?: number | null, digits = 1) => value == null ? "—" : value.toFixed(digits);
const scenarioLabel: Record<string, string> = { bear: "保守", base: "基準", bull: "樂觀", consensus: "市場共識" };

const navigation = [
  { id: "summary", label: "研究摘要" },
  { id: "financials", label: "財務分析" },
  { id: "revenue", label: "月營收" },
  { id: "business", label: "業務與能力" },
  { id: "scenarios", label: "情境模型" },
  { id: "signals", label: "驗證訊號" },
  { id: "catalysts", label: "催化劑" },
  { id: "risks", label: "風險觀察" },
  { id: "conclusion", label: "研究結論" },
];

export default async function ResearchDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await (await getResearchRepository()).getBySlug(slug);
  if (!data) notFound();

  const vm = buildResearchDashboard(data);
  const report = data.reports[0];
  const focus = vm.config.monthlyRevenue;
  const latest = vm.latestActual;
  const [thesisCore, ...thesisFootnotes] = report?.thesis?.split("；") ?? [];
  const thesisSteps = thesisCore?.split("→").map((item) => item.trim().replace(/[。.]+$/, "")).filter(Boolean) ?? vm.config.verificationChain;
  const thesisCaveat = thesisFootnotes.join("；").trim();
  const industryLabel = getIndustryLabel(data.company.industry);
  const sketch = getSketchVariant(data.company.industry);
  const signals = data.signals.map((signal) => ({ label: signal.metric, status: signal.status, value: signal.valueText, note: signal.notes }));

  return (
    <main id="main-content" className="notebookPage dossierPage">
      <div className="notebookShell dossierLayout">
        <ResearchNavigation items={navigation} />

        <div className="dossierContent">
          <section id="summary" className="dossierHero">
            <div className="dossierHeroGrid">
              <div>
                <div className="dossierKicker">Company Research Dossier · {data.company.market}</div>
                <h1 className="dossierTitle">{data.company.name} <span>{data.company.ticker}</span></h1>
                <p className="dossierSubtitle">{report?.title ?? "個股研究檔案"}</p>
                <div className="dossierMeta">
                  <span><strong>{industryLabel}</strong></span>
                  <span>as of <strong>{data.dashboard.monthlyRevenue.focusYear}.{String(data.dashboard.monthlyRevenue.cumulativeThroughMonth).padStart(2, "0")}</strong></span>
                  <span>report <strong>v{report?.version ?? "—"}</strong></span>
                </div>
                <ResearchNote label="WORKING THESIS" tone="yellow" className="heroThesisNote">{data.dashboard.currentView}</ResearchNote>
                <div className="dossierActions">
                  {report?.htmlPath ? <a className="linkButton linkButton--primary" href={report.htmlPath} target="_blank" rel="noreferrer">Open full research ↗</a> : null}
                  <Link className="linkButton" href="/research">Back to archive</Link>
                </div>
              </div>
              <ResearchSketch variant={sketch} label={data.company.ticker} />
            </div>
            <ThesisChain steps={thesisSteps} />
            {thesisCaveat ? <p className="thesisCaveat">＊ {thesisCaveat}</p> : null}
          </section>

          <PaperSection id="financials" index="01" eyebrow="VERIFIED FINANCIALS" title="先看已實現的數字" note="reported / not forecast">
            <p className="sectionLead">{data.dashboard.currentView}</p>
            <div className="researchMetrics">
              <ResearchMetric label={`${latest?.period ?? "Latest"} EPS`} value={fmt(latest?.eps, 2)} note="latest actual" highlight />
              {data.dashboard.headlineForecastYears.map((year) => <ResearchMetric key={year} label={`${year}F EPS`} value={fmt(vm.forecasts[year]?.eps, 2)} note={scenarioLabel[vm.config.forecastScenario] ?? vm.config.forecastScenario} />)}
              <ResearchMetric label="Overall signal" value={formatSignalLabel(vm.overallSignal)} note={`as of ${data.signals[0]?.asOfDate ?? "—"}`} />
            </div>
            <ResearchTable caption="Financial statements · TWD million unless noted">
              <thead><tr><th>Period</th><th>Revenue</th><th>Gross profit</th><th>GM</th><th>OP margin</th><th>Net income</th><th>EPS</th></tr></thead>
              <tbody>{data.actuals.map((actual) => <tr key={actual.id}><td>{actual.period}</td><td>{fmt(actual.revenue)}</td><td>{fmt(actual.grossProfit)}</td><td className={actual.id === latest?.id ? "tableHighlight" : ""}>{fmt(actual.grossMargin, 2)}%</td><td>{fmt(actual.operatingMargin, 2)}%</td><td>{fmt(actual.netIncome)}</td><td className={actual.id === latest?.id ? "tableHighlight" : ""}>{fmt(actual.eps, 2)}</td></tr>)}</tbody>
            </ResearchTable>
          </PaperSection>

          <PaperSection id="revenue" index="02" eyebrow="MONTHLY EVIDENCE" title="月營收：放量要看連續性" note="monthly revenue as proxy">
            <ResearchChart points={vm.monthlyRevenue} unitDivisor={focus.unitDivisor} unitLabel={focus.unitLabel} focusYear={focus.focusYear} />
            <ResearchTable caption="Official monthly revenue series">
              <thead><tr><th>Month</th><th>Revenue (million)</th><th>MoM</th><th>YoY</th></tr></thead>
              <tbody>{vm.monthlyRevenue.map((point, index) => <tr key={`${point.year}-${point.month}`}><td>{point.year}/{String(point.month).padStart(2, "0")}</td><td className={index === vm.monthlyRevenue.length - 1 ? "tableHighlight" : ""}>{fmt(point.revenue)}</td><td>{point.mom == null ? "—" : `${fmt(point.mom, 2)}%`}</td><td>{point.yoy == null ? "—" : `${fmt(point.yoy, 2)}%`}</td></tr>)}</tbody>
            </ResearchTable>
          </PaperSection>

          <PaperSection id="business" index="03" eyebrow="COMPANY / CAPABILITY" title="業務與能力：把規格和資格分開" note="evidence boundary">
            <div className="sectionColumns">
              <div>
                <ResearchTable caption="Official application categories">
                  <thead><tr><th>Period</th><th>Application / segment</th><th>Revenue</th><th>Share</th></tr></thead>
                  <tbody>{data.segments.map((segment, index) => <tr key={`${segment.period}-${segment.segment}-${index}`}><td>{segment.period}{segment.isEstimate ? "*" : ""}</td><td>{segment.segment}</td><td>{fmt(segment.revenue)}</td><td>{segment.share == null ? "—" : `${fmt(segment.share)}%`}</td></tr>)}</tbody>
                </ResearchTable>
                <p className="tableSubtle">{vm.config.estimateNote}</p>
              </div>
              <div className="capacityList">
                {data.capacity.map((item, index) => <div className="capacityRow" key={item.label}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong><p><b>{item.equipment}</b><br />{item.technology}<br />{item.notes}</p></div>)}
              </div>
            </div>
          </PaperSection>

          <PaperSection id="scenarios" index="04" eyebrow="SCENARIO NOTEBOOK" title="情境模型：不是目標價，是驗證區間" note="research inference">
            <div className="scenarioNotebook">
              {["bear", "base", "bull"].map((scenario) => {
                const scenarioKeys = scenario === "base" ? ["base", "consensus"] : [scenario];
                const forecast2026 = data.forecasts.find((item) => item.fiscalYear === 2026 && scenarioKeys.includes(item.scenario));
                const forecast2027 = data.forecasts.find((item) => item.fiscalYear === 2027 && scenarioKeys.includes(item.scenario));
                return <article className={`scenarioBlock scenarioBlock--${scenario}`} key={scenario}><h3>{scenarioLabel[scenario]}</h3><div className="scenarioValues"><div><span>2026F EPS</span><strong>{fmt(forecast2026?.eps, 2)}</strong></div><div><span>2027F EPS</span><strong>{fmt(forecast2027?.eps, 2)}</strong></div></div><p>{forecast2026?.notes ?? forecast2027?.notes ?? "研究情境尚無備註。"}</p></article>;
              })}
            </div>
            <ResearchNote label="ESTIMATE BOUNDARY" tone="blue" className="sectionNoteBlock">{vm.config.estimateNote}</ResearchNote>
          </PaperSection>

          <PaperSection id="signals" index="05" eyebrow="ANALYST VERIFICATION CHECKLIST" title="研究訊號：下一輪要核對什麼" note={`as of ${data.signals[0]?.asOfDate ?? "—"}`}>
            <ResearchChecklist items={signals} />
            <ResearchNote label="CURRENT READ" tone="green" className="sectionNoteBlock">{vm.config.conclusion}</ResearchNote>
          </PaperSection>

          <PaperSection id="catalysts" index="06" eyebrow="WHAT CAN PROVE THE THESIS?" title="催化劑：能把敘事變成證據的事件" note="watch for confirmation">
            <div className="researchList">
              {data.catalysts.map((item, index) => <div className="researchListItem" key={item.title}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong><p>{item.notes}</p></div>)}
            </div>
          </PaperSection>

          <PaperSection id="risks" index="07" eyebrow="RISK RESEARCH NOTES" title="風險觀察：目前不能跳過的反證" note="stay skeptical">
            <div className="riskGrid">{data.risks.map((risk) => <RiskNote key={risk.title} title={risk.title} notes={risk.notes} status={risk.status} impact={risk.impact} />)}</div>
          </PaperSection>

          <PaperSection id="conclusion" index="08" eyebrow="INVESTMENT THESIS" title="研究結論" note="keep the chain intact">
            <div className="investmentThesis">
              <div className="sectionEyebrow">CENTRAL INVESTMENT THESIS</div>
              <h3>核心投資主軸</h3>
              <p className="thesisSummary">{report?.summary ?? "研究摘要尚未建立。"}</p>
              <p>目前最值得追蹤的，不是猜測未公開的客戶名稱，而是確認 <HandDrawnUnderline>Revenue → Margin → Working Capital → Cash Flow → EPS</HandDrawnUnderline> 是否持續兌現。</p>
              <div className="thesisFormula">{thesisSteps.map((step) => <span key={step}>{step}</span>)}</div>
              <div className="verificationList">{vm.config.verificationChain.map((item, index) => <div className="verificationItem" key={item}><span>{String(index + 1).padStart(2, "0")} / NEXT CHECK</span><strong>{item}</strong></div>)}</div>
            </div>
            <div className="sectionColumns sectionColumns--equal" style={{ marginTop: 22 }}>
              <StickyNote tone="yellow">{data.dashboard.estimateNote}</StickyNote>
              <ResearchNote label="ARCHIVE NOTE" tone="red">公開事實、研究推論與尚未確認的資格邊界，必須在下一次資料更新時重新核對。</ResearchNote>
            </div>
          </PaperSection>

          <div className="dossierFooter">{data.company.name} {data.company.ticker} · Research Desk · {report?.publishedAt ?? "—"} · public evidence only</div>
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { cagr, findForecast, formatSignalLabel, overallSignal } from "@/lib/research/calculations";
import { getResearchRepository } from "@/lib/research/repository";

export const dynamic = "force-dynamic";

const fmt = (value?: number | null, digits = 1) => value == null ? "—" : value.toFixed(digits);

export default async function ResearchDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repo = await getResearchRepository();
  const data = await repo.getBySlug(slug);
  if (!data) notFound();

  const latest = [...data.actuals].sort((a,b) => b.period.localeCompare(a.period))[0];
  const c26 = findForecast(data.forecasts, 2026, "consensus");
  const c27 = findForecast(data.forecasts, 2027, "consensus");
  const report = data.reports[0];
  const overall = overallSignal(data.signals);
  const revenueCagr = c27?.revenue ? cagr(3380, c27.revenue, 2) : null;
  const epsCagr = c27?.eps ? cagr(2.96, c27.eps, 2) : null;
  const monthlyRevenue = [...data.monthlyRevenue].sort((a,b) => a.year - b.year || a.month - b.month);
  const maxMonthlyRevenue = Math.max(1, ...monthlyRevenue.map((m) => m.revenue));
  const h1Revenue = monthlyRevenue.filter((m) => m.year === 2026 && m.month <= 6).reduce((sum, m) => sum + m.revenue, 0);
  const latestMonthlyRevenue = monthlyRevenue[monthlyRevenue.length - 1];

  return <main>
    <section className="shell detailHero">
      <div className="eyebrow">{data.company.market} · {data.company.ticker}</div>
      <h1>{data.company.name}</h1>
      <div className="muted">{data.company.description}</div>
      <div className="topActions">
        {report?.htmlPath && <Link className="button" href={report.htmlPath} target="_blank">開啟完整互動報告</Link>}
        <Link className="button secondary" href="/research">返回研究列表</Link>
      </div>
    </section>

    {report && <section className="shell section">
      <h2 className="sectionTitle">研究摘要</h2>
      <div className="grid twoCol">
        <div className="card">
          <div className="small muted">Report v{report.version}</div>
          <h3 style={{margin:"6px 0 8px"}}>{report.title}</h3>
          <p style={{margin:0,lineHeight:1.7}}>{report.summary}</p>
        </div>
        <div className="card">
          <div className="small muted">核心 Thesis</div>
          <p style={{margin:"8px 0 0",lineHeight:1.7,fontWeight:800}}>{report.thesis}</p>
          <p className="small muted" style={{marginBottom:0}}>目前判讀：黃綠燈之間、偏綠。完整報告內保留 2026F H2 反推、2027F CAGR / 分部拆解、MOCVD 產能量化與升降級規則。</p>
        </div>
      </div>
    </section>}

    <section className="shell section">
      <div className="grid kpis">
        <div className="kpi"><div className="label">{latest?.period} EPS</div><div className="value">{fmt(latest?.eps,2)}</div><div className="small muted">最新實績</div></div>
        <div className="kpi"><div className="label">2026F EPS</div><div className="value">{fmt(c26?.eps,2)}</div><div className="small muted">市場中位</div></div>
        <div className="kpi"><div className="label">2027F EPS</div><div className="value">{fmt(c27?.eps,2)}</div><div className="small muted">市場中位</div></div>
        <div className="kpi"><div className="label">整體燈號</div><div className="value" style={{fontSize:20}}>{formatSignalLabel(overall)}</div><div className="small muted">截至 {data.signals[0]?.asOfDate ?? "—"}</div></div>
      </div>
    </section>

    <section className="shell section">
      <h2 className="sectionTitle">紅綠燈結論</h2>
      <div className="grid threeCol">{data.signals.map((s) => <div className="card signalCard" key={s.metric}>
        <div className={`statusLight ${s.status}`} />
        <h3>{s.metric} · {formatSignalLabel(s.status)}</h3>
        <p><b>{s.valueText}</b><br/>{s.notes}</p>
      </div>)}</div>
      <div className="bigConclusion" style={{marginTop:14}}><b>研究驗證鏈：</b> InP 供應 → 新機 utilization → 光電子營收 → 光電子占比 → 毛利率 → 營益率 → EPS。現階段方向偏正向，但毛利率、原料供應與新機利用率仍需要連續數季驗證。</div>
    </section>

    <section className="shell section">
      <div className="grid twoCol">
        <div>
          <h2 className="sectionTitle">月營收</h2>
          {monthlyRevenue.length > 0 && <div className="revenueChartPanel">
            <div className="revenueChartHeader">
              <div>
                <div className="revenueChartEyebrow">2026 MONTHLY REVENUE</div>
                <div className="revenueChartTitle">月營收趨勢</div>
              </div>
              <div className="revenueChartStats">
                <span><b>{(h1Revenue / 100).toFixed(2)} 億</b><small>2026/01–06 累計</small></span>
                {latestMonthlyRevenue && <span><b>{(latestMonthlyRevenue.revenue / 100).toFixed(2)} 億</b><small>{latestMonthlyRevenue.year}/{String(latestMonthlyRevenue.month).padStart(2,"0")} · YoY {latestMonthlyRevenue.yoy == null ? "—" : `${fmt(latestMonthlyRevenue.yoy,2)}%`}</small></span>}
              </div>
            </div>
            <div className="revenueChartScroll">
              <div className="revenueChart" style={{gridTemplateColumns:`repeat(${monthlyRevenue.length},minmax(54px,1fr))`}} role="img" aria-label="2026 年月營收柱狀圖">
                {monthlyRevenue.map((m, index) => <div className="revenueBarColumn" key={`bar-${m.year}-${m.month}`}>
                  <div className="revenueBarValue">{(m.revenue / 100).toFixed(2)}億</div>
                  <div className="revenueBarTrack">
                    <div className={`revenueBar${index === monthlyRevenue.length - 1 ? " latest" : ""}`} style={{height:`${Math.max(8,(m.revenue / maxMonthlyRevenue) * 100)}%`}} title={`${m.year}/${String(m.month).padStart(2,"0")}：${m.revenue.toFixed(1)} 百萬；MoM ${m.mom == null ? "—" : `${fmt(m.mom,2)}%`}；YoY ${m.yoy == null ? "—" : `${fmt(m.yoy,2)}%`}`} />
                  </div>
                  <div className="revenueBarMonth">{m.month}月</div>
                </div>)}
              </div>
            </div>
          </div>}
          <table><thead><tr><th>月份</th><th>Revenue (百萬)</th><th>MoM</th><th>YoY</th></tr></thead><tbody>
            {monthlyRevenue.map((m) => <tr key={`${m.year}-${m.month}`}><td>{m.year}/{String(m.month).padStart(2,"0")}</td><td>{fmt(m.revenue,1)}</td><td>{m.mom == null ? "—" : `${fmt(m.mom,2)}%`}</td><td>{m.yoy == null ? "—" : `${fmt(m.yoy,2)}%`}</td></tr>)}
          </tbody></table>
        </div>
        <div>
          <h2 className="sectionTitle">營收結構 / Segment Mix</h2>
          <table><thead><tr><th>Period</th><th>Segment</th><th>Revenue</th><th>Share</th></tr></thead><tbody>
            {data.segments.map((s, i) => <tr key={`${s.period}-${s.segment}-${i}`}><td>{s.period}{s.isEstimate ? "*" : ""}</td><td>{s.segment}</td><td>{fmt(s.revenue,1)}</td><td>{s.share == null ? "—" : `${fmt(s.share,1)}%`}</td></tr>)}
          </tbody></table>
          <div className="small muted" style={{marginTop:8}}>* 研究估計值，非公司正式 segment disclosure。</div>
        </div>
      </div>
    </section>

    <section className="shell section">
      <h2 className="sectionTitle">已實現財報</h2>
      <table><thead><tr><th>Period</th><th>Revenue (百萬)</th><th>GP (百萬)</th><th>GM</th><th>OP Margin</th><th>Net Income</th><th>EPS</th></tr></thead><tbody>
        {data.actuals.map((a) => <tr key={a.id}><td>{a.period}</td><td>{fmt(a.revenue)}</td><td>{fmt(a.grossProfit)}</td><td>{fmt(a.grossMargin,2)}%</td><td>{fmt(a.operatingMargin,2)}%</td><td>{fmt(a.netIncome)}</td><td>{fmt(a.eps,2)}</td></tr>)}
      </tbody></table>
    </section>

    <section className="shell section">
      <h2 className="sectionTitle">2026F / 2027F 情境</h2>
      <table><thead><tr><th>年度 / 情境</th><th>Revenue (百萬)</th><th>GM</th><th>Net Income</th><th>EPS</th><th>光電子占比</th></tr></thead><tbody>
        {data.forecasts.map((f) => <tr key={`${f.fiscalYear}-${f.scenario}`}><td>{f.fiscalYear} · {f.scenario}</td><td>{fmt(f.revenue,0)}</td><td>{fmt(f.grossMargin,2)}%</td><td>{fmt(f.netIncome,0)}</td><td>{fmt(f.eps,2)}</td><td>{f.optoShare == null ? "—" : `${fmt(f.optoShare,1)}%`}</td></tr>)}
      </tbody></table>
      <div className="grid twoCol" style={{marginTop:14}}>
        <div className="card"><div className="small muted">2025A → 2027F Revenue CAGR</div><div className="companyName">{revenueCagr == null ? "—" : `${revenueCagr.toFixed(1)}%`}</div></div>
        <div className="card"><div className="small muted">2025A → 2027F EPS CAGR</div><div className="companyName">{epsCagr == null ? "—" : `${epsCagr.toFixed(1)}%`}</div></div>
      </div>
    </section>

    <section className="shell section">
      <h2 className="sectionTitle">產能與設備</h2>
      <div className="grid threeCol">{data.capacity.map((c) => <div className="card" key={c.label}><div className="ticker">{c.equipment} · {c.status}</div><div style={{fontWeight:900,fontSize:17,margin:"5px 0"}}>{c.label}</div><div className="small muted">{c.technology}<br/>{c.notes}</div></div>)}</div>
    </section>

    <section className="shell section">
      <div className="grid twoCol">
        <div><h2 className="sectionTitle">Catalysts</h2><div className="card"><ul className="list">{data.catalysts.map((x)=><li key={x.title}><b>{x.title}</b> — {x.notes}</li>)}</ul></div></div>
        <div><h2 className="sectionTitle">Risks</h2><div className="card"><ul className="list">{data.risks.map((x)=><li key={x.title}><b>{x.title}</b> — {x.notes}</li>)}</ul></div></div>
      </div>
    </section>

    <div className="footerSpace" />
  </main>;
}

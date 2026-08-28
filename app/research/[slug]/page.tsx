import Link from "next/link";
import { notFound } from "next/navigation";
import { formatSignalLabel } from "@/lib/research/calculations";
import { buildResearchDashboard } from "@/lib/research/dashboard";
import { getResearchRepository } from "@/lib/research/repository";

export const dynamic = "force-dynamic";
const fmt=(value?:number|null,digits=1)=>value==null?"—":value.toFixed(digits);

export default async function ResearchDetailPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const data=await (await getResearchRepository()).getBySlug(slug);
  if(!data) notFound();
  const vm=buildResearchDashboard(data);
  const report=data.reports[0];
  const focus=vm.config.monthlyRevenue;
  const forecastYears=vm.config.headlineForecastYears;
  const firstForecast=vm.forecasts[forecastYears[0]];
  const secondForecast=vm.forecasts[forecastYears[1]];

  return <main>
    <section className="shell detailHero">
      <div className="eyebrow">{data.company.market} · {data.company.ticker}</div><h1>{data.company.name}</h1>
      <div className="muted">{data.company.description}</div>
      <div className="topActions">{report?.htmlPath&&<Link className="button" href={report.htmlPath} target="_blank">開啟完整互動報告</Link>}<Link className="button secondary" href="/research">返回研究列表</Link></div>
    </section>

    {report&&<section className="shell section"><h2 className="sectionTitle">研究摘要</h2><div className="grid twoCol">
      <div className="card"><div className="small muted">Report v{report.version}</div><h3 style={{margin:"6px 0 8px"}}>{report.title}</h3><p style={{margin:0,lineHeight:1.7}}>{report.summary}</p></div>
      <div className="card"><div className="small muted">核心 Thesis</div><p style={{margin:"8px 0 0",lineHeight:1.7,fontWeight:800}}>{report.thesis}</p><p className="small muted" style={{marginBottom:0}}>{vm.config.currentView}</p></div>
    </div></section>}

    <section className="shell section"><div className="grid kpis">
      <div className="kpi"><div className="label">{vm.latestActual?.period} EPS</div><div className="value">{fmt(vm.latestActual?.eps,2)}</div><div className="small muted">最新實績</div></div>
      <div className="kpi"><div className="label">{forecastYears[0]}F EPS</div><div className="value">{fmt(firstForecast?.eps,2)}</div><div className="small muted">市場中位</div></div>
      <div className="kpi"><div className="label">{forecastYears[1]}F EPS</div><div className="value">{fmt(secondForecast?.eps,2)}</div><div className="small muted">市場中位</div></div>
      <div className="kpi"><div className="label">整體燈號</div><div className="value" style={{fontSize:20}}>{formatSignalLabel(vm.overallSignal)}</div><div className="small muted">截至 {data.signals[0]?.asOfDate??"—"}</div></div>
    </div></section>

    <section className="shell section"><h2 className="sectionTitle">紅綠燈結論</h2><div className="grid threeCol">{data.signals.map(s=><div className="card signalCard" key={s.metric}><div className={`statusLight ${s.status}`}/><h3>{s.metric} · {formatSignalLabel(s.status)}</h3><p><b>{s.valueText}</b><br/>{s.notes}</p></div>)}</div>
      <div className="bigConclusion" style={{marginTop:14}}><b>研究驗證鏈：</b> {vm.config.verificationChain.join(" → ")}。{vm.config.conclusion}</div>
    </section>

    <section className="shell section"><div className="grid twoCol"><div><h2 className="sectionTitle">月營收</h2>
      {vm.monthlyRevenue.length>0&&<div className="revenueChartPanel"><div className="revenueChartHeader"><div><div className="revenueChartEyebrow">{focus.focusYear} MONTHLY REVENUE</div><div className="revenueChartTitle">月營收趨勢</div></div><div className="revenueChartStats">
        <span><b>{(vm.cumulativeRevenue/focus.unitDivisor).toFixed(2)} {focus.unitLabel}</b><small>{vm.cumulativeLabel}</small></span>
        {vm.latestMonthlyRevenue&&<span><b>{(vm.latestMonthlyRevenue.revenue/focus.unitDivisor).toFixed(2)} {focus.unitLabel}</b><small>{vm.latestMonthlyRevenue.year}/{String(vm.latestMonthlyRevenue.month).padStart(2,"0")} · YoY {vm.latestMonthlyRevenue.yoy==null?"—":`${fmt(vm.latestMonthlyRevenue.yoy,2)}%`}</small></span>}
      </div></div><div className="revenueChartScroll"><div className="revenueChart" style={{gridTemplateColumns:`repeat(${vm.monthlyRevenue.length},minmax(54px,1fr))`}} role="img" aria-label={`${focus.focusYear} 年月營收柱狀圖`}>
        {vm.monthlyRevenue.map((m,index)=><div className="revenueBarColumn" key={`bar-${m.year}-${m.month}`}><div className="revenueBarValue">{(m.revenue/focus.unitDivisor).toFixed(2)}{focus.unitLabel}</div><div className="revenueBarTrack"><div className={`revenueBar${index===vm.monthlyRevenue.length-1?" latest":""}`} style={{height:`${Math.max(8,(m.revenue/vm.maxMonthlyRevenue)*100)}%`}} title={`${m.year}/${String(m.month).padStart(2,"0")}：${m.revenue.toFixed(1)} 百萬；MoM ${m.mom==null?"—":`${fmt(m.mom,2)}%`}；YoY ${m.yoy==null?"—":`${fmt(m.yoy,2)}%`}`}/></div><div className="revenueBarMonth">{m.month}月</div></div>)}
      </div></div></div>}
      <table><thead><tr><th>月份</th><th>Revenue (百萬)</th><th>MoM</th><th>YoY</th></tr></thead><tbody>{vm.monthlyRevenue.map(m=><tr key={`${m.year}-${m.month}`}><td>{m.year}/{String(m.month).padStart(2,"0")}</td><td>{fmt(m.revenue,1)}</td><td>{m.mom==null?"—":`${fmt(m.mom,2)}%`}</td><td>{m.yoy==null?"—":`${fmt(m.yoy,2)}%`}</td></tr>)}</tbody></table>
    </div><div><h2 className="sectionTitle">營收結構 / Segment Mix</h2><table><thead><tr><th>Period</th><th>Segment</th><th>Revenue</th><th>Share</th></tr></thead><tbody>{data.segments.map((s,i)=><tr key={`${s.period}-${s.segment}-${i}`}><td>{s.period}{s.isEstimate?"*":""}</td><td>{s.segment}</td><td>{fmt(s.revenue,1)}</td><td>{s.share==null?"—":`${fmt(s.share,1)}%`}</td></tr>)}</tbody></table><div className="small muted" style={{marginTop:8}}>{vm.config.estimateNote}</div></div></div></section>

    <section className="shell section"><h2 className="sectionTitle">已實現財報</h2><table><thead><tr><th>Period</th><th>Revenue (百萬)</th><th>GP (百萬)</th><th>GM</th><th>OP Margin</th><th>Net Income</th><th>EPS</th></tr></thead><tbody>{data.actuals.map(a=><tr key={a.id}><td>{a.period}</td><td>{fmt(a.revenue)}</td><td>{fmt(a.grossProfit)}</td><td>{fmt(a.grossMargin,2)}%</td><td>{fmt(a.operatingMargin,2)}%</td><td>{fmt(a.netIncome)}</td><td>{fmt(a.eps,2)}</td></tr>)}</tbody></table></section>

    <section className="shell section"><h2 className="sectionTitle">{vm.forecastRangeLabel}</h2><table><thead><tr><th>年度 / 情境</th><th>Revenue (百萬)</th><th>GM</th><th>Net Income</th><th>EPS</th><th>{vm.config.focusMetric.label}</th></tr></thead><tbody>{data.forecasts.map(f=><tr key={`${f.fiscalYear}-${f.scenario}`}><td>{f.fiscalYear} · {f.scenario}</td><td>{fmt(f.revenue,0)}</td><td>{fmt(f.grossMargin,2)}%</td><td>{fmt(f.netIncome,0)}</td><td>{fmt(f.eps,2)}</td><td>{f[vm.config.focusMetric.field]==null?"—":`${fmt(f[vm.config.focusMetric.field],1)}%`}</td></tr>)}</tbody></table>
      <div className="grid twoCol" style={{marginTop:14}}>{vm.cagrCards.map(card=><div className="card" key={`${card.field}-${card.targetYear}`}><div className="small muted">{card.label}</div><div className="companyName">{card.value==null?"—":`${card.value.toFixed(1)}%`}</div></div>)}</div>
    </section>

    <section className="shell section"><h2 className="sectionTitle">產能與設備</h2><div className="grid threeCol">{data.capacity.map(c=><div className="card" key={c.label}><div className="ticker">{c.equipment} · {c.status}</div><div style={{fontWeight:900,fontSize:17,margin:"5px 0"}}>{c.label}</div><div className="small muted">{c.technology}<br/>{c.notes}</div></div>)}</div></section>
    <section className="shell section"><div className="grid twoCol"><div><h2 className="sectionTitle">Catalysts</h2><div className="card"><ul className="list">{data.catalysts.map(x=><li key={x.title}><b>{x.title}</b> — {x.notes}</li>)}</ul></div></div><div><h2 className="sectionTitle">Risks</h2><div className="card"><ul className="list">{data.risks.map(x=><li key={x.title}><b>{x.title}</b> — {x.notes}</li>)}</ul></div></div></div></section>
    <div className="footerSpace"/>
  </main>;
}

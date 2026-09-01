import Link from "next/link";
import { formatSignalLabel, overallSignal } from "@/lib/research/calculations";
import { getResearchRepository } from "@/lib/research/repository";

export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  const repo = await getResearchRepository();
  const items = await repo.listPublishedCompanies();

  return <main>
    <section className="shell hero">
      <div className="eyebrow">Equity Research Database</div>
      <h1>個股研究資料庫</h1>
      <p>把財報實績、月營收、產品組合、財測情境、產能、催化劑、風險與紅綠燈訊號集中成可持續更新的研究系統。</p>
    </section>
    <section className="shell grid companyGrid">
      {items.map(({ company, report, latestActual, headlineForecast, signals }) => {
        const overall = overallSignal(signals);
        return <Link href={`/research/${company.slug}`} className="card companyCard" key={company.id}>
          <div className="ticker">{company.market} · {company.ticker}</div>
          <div className="companyName">{company.name}</div>
          <div className="small muted" style={{ marginTop: 6 }}>{company.industry}</div>
          <div className="grid metricGrid">
            <div className="metric"><div className="label">最新 EPS</div><div className="value">{latestActual?.eps?.toFixed(2) ?? "—"}</div></div>
            <div className="metric"><div className="label">{headlineForecast?.fiscalYear ?? "—"}F EPS</div><div className="value">{headlineForecast?.eps?.toFixed(2) ?? "—"}</div></div>
            <div className="metric"><div className="label">研究燈號</div><div className="value" style={{fontSize:15}}>{formatSignalLabel(overall)}</div></div>
          </div>
          <div className="signalRow">{signals.map((s) => <span key={s.metric} className={`signalPill ${s.status}`}>{s.metric}</span>)}</div>
          <div className="small muted" style={{ marginTop: 14 }}>最新報告：{report.version} · {report.publishedAt}</div>
        </Link>;
      })}
    </section>
  </main>;
}

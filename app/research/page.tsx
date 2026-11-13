import type { ReactNode } from "react";
import { getResearchRepository } from "@/lib/research/repository";
import { MarkerHighlight, ResearchNote, ResearchSketch, SketchDivider } from "./components/research-notebook";
import { ResearchIndex } from "./research-client";

export const dynamic = "force-dynamic";

function latestUpdated(items: Array<{ report: { publishedAt?: string | null } }>) {
  return items.map((item) => item.report.publishedAt ?? "").sort().at(-1)?.replaceAll("-", ".") ?? "—";
}

export default async function ResearchPage() {
  const items = await (await getResearchRepository()).listPublishedCompanies();
  const updated = latestUpdated(items);

  return (
    <main id="main-content" className="notebookPage archivePage">
      <section className="notebookShell archiveHero">
        <div className="heroCopy">
          <div className="heroKicker">Equity Research Archive</div>
          <h1 className="heroTitle">個股研究<br /><MarkerHighlight>資料庫</MarkerHighlight></h1>
          <p className="heroLead">把財報實績、月營收、產品組合、財測情境、產能、催化劑、風險與研究訊號，整理成可持續更新的研究系統。</p>
          <p className="heroAnnotation">Research Notes<br />資料不是答案，<br /><HandwrittenPhrase>驗證鏈才是研究。</HandwrittenPhrase></p>
        </div>
        <ResearchSketch variant="archive" label="research archive" />
      </section>

      <div className="notebookShell"><SketchDivider label="open the files →" /></div>

      <section className="notebookShell archiveSection" aria-labelledby="archive-heading">
        <div className="archiveHeader">
          <div>
            <div className="heroKicker">Research Archive</div>
            <h2 id="archive-heading">研究檔案索引</h2>
          </div>
          <div className="archiveMeta">
            <div><span>Reports</span><strong>{String(items.length).padStart(2, "0")}</strong></div>
            <div><span>Last updated</span><strong>{updated.slice(0, 7)}</strong></div>
          </div>
        </div>
        <ResearchIndex items={items} />
      </section>

      <section className="notebookShell archiveSection" aria-labelledby="power-reports-heading">
        <div className="archiveHeader">
          <div>
            <div className="heroKicker">Independent Company Research / 2026.11.13</div>
            <h2 id="power-reports-heading">AI 電力基建｜獨立公司研究</h2>
            <p className="reportSummary">台達電與光寶科分別成冊；涵蓋財報、產品進度、券商預估差異與估值試算。</p>
          </div>
        </div>
        <div className="researchIndexGrid">
          <a className="reportIndexItem" href="/research/reports/delta-2308.html">
            <div className="reportNumber" aria-hidden="true">01</div>
            <div className="reportIndexBody">
              <div className="reportIndexTopline"><span className="reportTicker">TW · 2308</span></div>
              <div className="reportTitleRow"><h3>台達電</h3><span className="reportOpen">Open research ↗</span></div>
              <p className="reportDescriptor">HVDC、液冷與 Power Rack｜2027–2028 獲利驗證</p>
              <p className="reportSummary">2026Q3 EPS 9.04 元；2026/10 營收 746.66 億元。獨立 10 章專題研究。</p>
              <div className="reportIndexMetrics"><div><span>Source cutoff</span><strong>2026.11.13</strong></div><div><span>View</span><strong>Standalone</strong></div></div>
            </div>
          </a>
          <a className="reportIndexItem" href="/research/reports/liteon-2301.html">
            <div className="reportNumber" aria-hidden="true">02</div>
            <div className="reportIndexBody">
              <div className="reportIndexTopline"><span className="reportTicker">TW · 2301</span></div>
              <div className="reportTitleRow"><h3>光寶科</h3><span className="reportOpen">Open research ↗</span></div>
              <p className="reportDescriptor">高瓦數 PSU、BBU 與 Power Rack｜營運槓桿</p>
              <p className="reportSummary">2026Q3 EPS 3.27 元；2026/10 營收 200.71 億元。獨立 10 章專題研究。</p>
              <div className="reportIndexMetrics"><div><span>Source cutoff</span><strong>2026.11.13</strong></div><div><span>View</span><strong>Standalone</strong></div></div>
            </div>
          </a>
        </div>
      </section>

      <section className="notebookShell archiveFootnote" aria-label="研究系統說明">
        <h3>長期研究，不是一次性快照。</h3>
        <ResearchNote label="DESK NOTE" tone="blue">每一份 dossier 都保留研究摘要、驗證訊號與下一輪需要追蹤的證據。先讀結論，再回到資料。</ResearchNote>
      </section>
    </main>
  );
}

function HandwrittenPhrase({ children }: { children: ReactNode }) {
  return <span className="handUnderline">{children}</span>;
}

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

      <section className="notebookShell archiveSection" aria-labelledby="preview-heading">
        <div className="archiveHeader">
          <div>
            <div className="heroKicker">Public Preview / Research Draft</div>
            <h2 id="preview-heading">Full Report 預覽｜內容尚未審核</h2>
            <p className="reportSummary">依使用者要求先公開標準格式報告；EQ-01 盈餘品質為 NOT_RUN，券商假設與財務數字待後續逐項校對，不屬正式投資結論。</p>
          </div>
        </div>
        <div className="researchIndexGrid">
          <a className="reportIndexItem" href="/research/reports/delta-2308.html">
            <div className="reportIndexBody">
              <div className="reportIndexTopline"><span className="reportTicker">TW · 2308 / PREVIEW</span></div>
              <div className="reportTitleRow"><h3>台達電｜Full Report</h3></div>
              <p className="reportDescriptor">電源／HVDC／液冷；2027–2028年情境</p>
              <p className="reportSummary">研究預覽，盈餘品質及券商推估尚未完成審核。</p>
            </div>
          </a>
          <a className="reportIndexItem" href="/research/reports/liteon-2301.html">
            <div className="reportIndexBody">
              <div className="reportIndexTopline"><span className="reportTicker">TW · 2301 / PREVIEW</span></div>
              <div className="reportTitleRow"><h3>光寶科｜Full Report</h3></div>
              <p className="reportDescriptor">PSU／BBU／Power Rack；2027–2028年情境</p>
              <p className="reportSummary">研究預覽，業外損益觸發 EQ-01 L2，尚待審閱。</p>
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

import type { ReactNode } from "react";
import { getResearchRepository } from "@/lib/research/repository";
import { MarkerHighlight, ResearchNote, ResearchSketch, SketchDivider } from "./components/research-notebook";
import { ResearchIndex } from "./research-client";

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

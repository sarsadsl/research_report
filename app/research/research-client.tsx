"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { formatSignalLabel, overallSignal } from "@/lib/research/calculations";
import type { ResearchListItem, SignalStatus } from "@/lib/research/types";
import { getIndustryLabel, IndustryTag, ResearchSketch, ResearchStatus } from "./components/research-notebook";

function formatDate(value?: string | null) {
  return value ? value.replaceAll("-", ".") : "—";
}

export function ReportIndexItem({ item, index }: { item: ResearchListItem; index: number }) {
  const signal = overallSignal(item.signals);
  const industry = getIndustryLabel(item.company.industry);
  const sketch = /BBU|battery|電池|電源/i.test(industry) ? "battery" : /Optical|光|半導體/i.test(industry) ? "optical" : "generic";
  return (
    <Link className="reportIndexItem" href={`/research/${item.company.slug}`}>
      <div className="reportNumber" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
      <div className="reportIndexBody">
        <div className="reportIndexTopline"><span className="reportTicker">{item.company.market} · {item.company.ticker}</span><IndustryTag label={industry} /></div>
        <div className="reportTitleRow"><h3>{item.company.name}</h3><span className="reportOpen">Open research ↗</span></div>
        <p className="reportDescriptor">{item.report.title}</p>
        <p className="reportSummary">{item.report.summary}</p>
        <div className="reportIndexMetrics">
          <div><span>Latest EPS</span><strong>{item.latestActual?.eps?.toFixed(2) ?? "—"}</strong></div>
          <div><span>預估 EPS</span><strong>{item.headlineForecast?.eps?.toFixed(2) ?? "—"}</strong><small className="reportForecastYear">{item.headlineForecast ? `${item.headlineForecast.fiscalYear}F` : "—"}</small></div>
          <div><span>Signal</span><ResearchStatus status={signal} label={formatSignalLabel(signal)} /></div>
          <div><span>Updated</span><strong className="reportDate">{formatDate(item.report.publishedAt)}</strong></div>
        </div>
      </div>
      <ResearchSketch variant={sketch as "battery" | "optical" | "generic"} label={item.company.ticker} />
    </Link>
  );
}

function categoryFor(item: ResearchListItem) {
  const value = `${item.company.industry ?? ""} ${item.report.title}`;
  if (/BBU|電池|電源|battery|power/i.test(value)) return "BBU";
  if (/銅箔|PCB|CCL|HVLP|copper foil/i.test(value)) return "PCB / CCL";
  if (/光|光電|optical|laser/i.test(value)) return "Optical";
  if (/半導體|compound|semiconductor/i.test(value)) return "Semiconductor";
  if (/信任科技|防詐|trusttech|anti.scam/i.test(value)) return "TrustTech";
  return "Research";
}

export function ResearchIndex({ items }: { items: ResearchListItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = useMemo(() => ["All", ...Array.from(new Set(items.map(categoryFor))).sort()], [items]);
  const visible = useMemo(() => {
    const normalized = query.trim().normalize("NFKC").toLowerCase();
    return items.filter((item) => {
      const matchesCategory = category === "All" || categoryFor(item) === category;
      const searchable = [item.company.name, item.company.ticker, item.company.industry,
        getIndustryLabel(item.company.industry), categoryFor(item), item.report.title, item.report.summary]
        .filter(Boolean).join(" ").normalize("NFKC").toLowerCase();
      return matchesCategory && (!normalized || searchable.includes(normalized));
    });
  }, [category, items, query]);

  return (
    <>
      <div className="researchTools">
        <label className="researchSearch"><span className="searchIcon" aria-hidden="true">⌕</span><span className="srOnly">搜尋研究報告</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search research…" /></label>
        <div className="indexTabs" role="group" aria-label="研究分類">
          {categories.map((item) => <button type="button" aria-pressed={category === item} className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
      </div>
      <div className="indexResultMeta" role="status" aria-live="polite"><span>{visible.length.toString().padStart(2, "0")} dossiers</span><span>{visible.length === items.length ? "complete archive" : "filtered view"}</span></div>
      <div className="researchIndexGrid">
        {visible.length ? visible.map((item) => <ReportIndexItem item={item} index={items.indexOf(item)} key={item.company.id} />) : <div className="emptyResearch">No research file matches this search.</div>}
      </div>
    </>
  );
}

export function ResearchNavigation({ items }: { items: Array<{ id: string; label: string }> }) {
  const [active, setActive] = useState(items[0]?.id ?? "summary");
  useEffect(() => {
    const sections = items.map((item) => document.getElementById(item.id)).filter(Boolean) as HTMLElement[];
    if (!sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]?.target.id) setActive(visible[0].target.id);
    }, { rootMargin: "-18% 0px -68% 0px", threshold: [0, 0.2] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  return (
    <>
      <aside className="notebookNav" aria-label="研究筆記索引">
        <div className="navEyebrow">NOTEBOOK INDEX</div>
        <div className="navRule" />
        <nav>{items.map((item, index) => <a className={active === item.id ? "active" : ""} href={`#${item.id}`} key={item.id}><span>{String(index + 1).padStart(2, "0")}</span>{item.label}</a>)}</nav>
        <div className="navMarginNote">read → verify<br />then update</div>
      </aside>
      <nav className="mobileNotebookNav" aria-label="研究章節索引">
        {items.map((item) => <a className={active === item.id ? "active" : ""} href={`#${item.id}`} key={item.id}>{item.label}</a>)}
      </nav>
    </>
  );
}

export function ResearchRouteEffects() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}

export type ResearchStatusValue = SignalStatus;

import Link from "next/link";
import type { ReactNode } from "react";
import type { MonthlyRevenue, SignalStatus } from "@/lib/research/types";
import { formatSignalLabel } from "@/lib/research/calculations";

type SketchVariant = "archive" | "battery" | "optical" | "generic";

export function ResearchMasthead() {
  return (
    <header className="siteHeader">
      <div className="notebookShell mastheadInner">
        <Link href="/research" className="notebookBrand">
          <svg className="brandDocument" viewBox="0 0 24 28" fill="none" aria-hidden="true" focusable="false"><path d="M4 2h11l5 5v19H4zM15 2v6h5M8 13h8M8 17h8M8 21h5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
          <span>Research Desk</span>
        </Link>
        <nav className="mastheadNav" aria-label="主要導覽">
          <Link href="/research" className="mastheadLink">Research Archive</Link>
          <span className="mastheadAnnotation">field notes · updated continuously</span>
        </nav>
      </div>
    </header>
  );
}

export function PaperSection({
  id,
  index,
  eyebrow,
  title,
  note,
  children,
  className = "",
}: {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  note?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`paperSection ${className}`}>
      <div className="sectionHeading">
        <span className="sectionIndex" aria-hidden="true">{index}</span>
        <div>
          <div className="sectionEyebrow">{eyebrow}</div>
          <h2>{title}</h2>
        </div>
        {note ? <span className="sectionHeaderNote">{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function IndustryTag({ label }: { label: string }) {
  return <span className="industryTag">{label}</span>;
}

export function MarkerHighlight({ children }: { children: ReactNode }) {
  return <span className="markerHighlight">{children}</span>;
}

export function HandDrawnUnderline({ children }: { children: ReactNode }) {
  return <span className="handUnderline">{children}</span>;
}

export function SketchDivider({ label = "research note" }: { label?: string }) {
  return <div className="sketchDivider" aria-hidden="true"><span>{label}</span></div>;
}

export function ResearchNote({
  children,
  label = "RESEARCH NOTE",
  tone = "yellow",
  className = "",
}: {
  children: ReactNode;
  label?: string;
  tone?: "yellow" | "blue" | "red" | "green";
  className?: string;
}) {
  return (
    <aside className={`researchNote researchNote--${tone} ${className}`}>
      <span className="notePin" aria-hidden="true" />
      <div>
        <div className="noteLabel">{label}</div>
        <div className="noteBody">{children}</div>
      </div>
    </aside>
  );
}

export function StickyNote({ children, tone = "yellow" }: { children: ReactNode; tone?: "yellow" | "blue" | "red" }) {
  return <div className={`stickyNote stickyNote--${tone}`}>{children}</div>;
}

export function ResearchMetric({
  label,
  value,
  note,
  highlight = false,
}: {
  label: string;
  value: string;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <div className="researchMetric">
      <span className="metricLabel">{label}</span>
      <strong className={highlight ? "metricValue metricValue--highlight" : "metricValue"}>{value}</strong>
      {note ? <span className="metricNote">{note}</span> : null}
    </div>
  );
}

export function ResearchStatus({ status, label }: { status: SignalStatus; label?: string }) {
  return (
    <span className={`researchStatus researchStatus--${status}`}>
      <span className="statusDot" aria-hidden="true" />
      <span>{label ?? formatSignalLabel(status)}</span>
    </span>
  );
}

export function ResearchSignal({
  label,
  status,
  value,
  note,
  mark = "✓",
}: {
  label: string;
  status: SignalStatus;
  value?: string | null;
  note?: string | null;
  mark?: string;
}) {
  return (
    <div className={`researchSignal researchSignal--${status}`}>
      <span className="signalMark" aria-hidden="true">{mark}</span>
      <div className="signalCopy">
        <strong>{label}</strong>
        {value ? <span>{value}</span> : null}
        {note ? <small>{note}</small> : null}
      </div>
      <ResearchStatus status={status} />
    </div>
  );
}

export function ResearchChecklist({
  items,
}: {
  items: Array<{ label: string; status: SignalStatus; value?: string | null; note?: string | null; mark?: string }>;
}) {
  return (
    <div className="researchChecklist">
      {items.map((item) => <ResearchSignal key={item.label} {...item} />)}
    </div>
  );
}

export function ResearchTable({ caption, children, className = "" }: { caption?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`researchTableWrap ${className}`}>
      {caption ? <div className="tableCaption">{caption}</div> : null}
      <div className="tableScroll"><table className="researchTable">{children}</table></div>
    </div>
  );
}

export function ResearchChart({
  points,
  unitDivisor,
  unitLabel,
  focusYear,
}: {
  points: MonthlyRevenue[];
  unitDivisor: number;
  unitLabel: string;
  focusYear: number;
}) {
  const maxRevenue = Math.max(1, ...points.map((point) => point.revenue));
  const latest = points.at(-1);
  const previous = points.at(-2);
  const revenueNote = latest && previous && latest.revenue < previous.revenue
    ? `${latest.month} 月較 ${previous.month} 月回落，下一步驗證營收能否維持高檔。`
    : latest?.revenue === maxRevenue
      ? `${latest.month} 月為本研究期高點，後續要看是否形成連續性。`
      : "下一步驗證最新月營收能否維持高檔。";
  return (
    <div className="researchChartPanel">
      <div className="chartHeader">
        <div>
          <div className="sectionEyebrow">{focusYear} MONTHLY REVENUE</div>
          <h3>月營收動能</h3>
        </div>
        {latest ? <ResearchNote label="FIELD NOTE" tone="yellow">{revenueNote}</ResearchNote> : null}
      </div>
      <div className="chartScroll">
        <div className="researchChart" role="img" aria-label={`${focusYear} 年月營收柱狀圖`}>
          <div className="chartGridLine chartGridLine--top" aria-hidden="true" />
          <div className="chartGridLine chartGridLine--mid" aria-hidden="true" />
          <div className="chartGridLine chartGridLine--bottom" aria-hidden="true" />
          {points.map((point, index) => {
            const isLatest = index === points.length - 1;
            return (
              <div className="chartColumn" key={`${point.year}-${point.month}`}>
                <span className="chartValue">{(point.revenue / unitDivisor).toFixed(2)}{unitLabel}</span>
                <div className="chartTrack">
                  <div className={`chartBar ${isLatest ? "chartBar--latest" : ""}`} style={{ height: `${Math.max(8, (point.revenue / maxRevenue) * 100)}%` }}>
                    {isLatest ? <span className="chartMarker" aria-hidden="true" /> : null}
                  </div>
                </div>
                <span className="chartMonth">{point.month}月</span>
              </div>
            );
          })}
        </div>
      </div>
      {latest ? <div className="chartFootnote">最新：{latest.year}/{String(latest.month).padStart(2, "0")} · {latest.revenue.toFixed(1)} 百萬 · YoY {latest.yoy == null ? "—" : `${latest.yoy.toFixed(2)}%`}</div> : null}
    </div>
  );
}

export function RiskNote({ title, notes, status, impact }: { title: string; notes?: string | null; status: string; impact: string }) {
  const tone = status.toLowerCase().includes("active") || impact === "high" ? "red" : "yellow";
  return (
    <article className={`riskNote riskNote--${tone}`}>
      <div className="riskNoteHead"><span className="riskGlyph" aria-hidden="true">!</span><strong>{title}</strong><span className="smallStamp">{status}</span></div>
      <p>{notes}</p>
    </article>
  );
}

export function ThesisChain({ steps }: { steps: string[] }) {
  return (
    <div className="thesisChain" aria-label="研究驗證鏈">
      {steps.map((step, index) => <div className="thesisStep" key={`${step}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></div>)}
    </div>
  );
}

export function ResearchSketch({ variant, label }: { variant: SketchVariant; label: string }) {
  return (
    <div className={`researchSketch researchSketch--${variant}`} aria-label={`${label} technical sketch`} role="img">
      <div className="sketchTopline"><span>FIELD SKETCH / 01</span><span>{label}</span></div>
      <svg viewBox="0 0 420 270" focusable="false" aria-hidden="true">
        <path className="sketchStroke sketchStroke--thin" d="M36 210h350M54 220h315M73 233h270" />
        {variant === "battery" || variant === "archive" ? <>
          <rect className="sketchStroke" x="76" y="72" width="126" height="112" rx="4" />
          <path className="sketchStroke" d="M202 106h22v44h-22M92 91h94M92 166h94M105 112h66v32h-66z" />
          <path className="sketchStroke sketchStroke--thin" d="M120 112v32M138 112v32M156 112v32M239 103h77v71h-77zM253 116h49M253 132h49M253 148h32" />
          <path className="sketchStroke sketchArrow" d="M224 126h17M224 126l8-6M224 126l8 6M198 89l24-20" />
        </> : null}
        {variant === "optical" ? <>
          <path className="sketchStroke" d="M70 170h235l54 28H124zM92 143l144-48 74 24-145 48zM236 95v48M310 119v47" />
          <path className="sketchStroke sketchStroke--thin" d="M121 132l89-30M150 142l90-30M179 151l90-29M330 104l36-18M330 117l50-1M330 130l38 18" />
          <circle className="sketchStroke" cx="95" cy="75" r="22" /><path className="sketchStroke" d="M117 75h63M159 75l16-10M159 75l16 10" />
        </> : null}
        {variant === "generic" ? <>
          <rect className="sketchStroke" x="64" y="88" width="274" height="95" />
          <path className="sketchStroke" d="M64 111h274M108 88v95M230 88v95M275 111v72" />
          <path className="sketchStroke sketchStroke--thin" d="M83 132h12M83 146h12M124 132h78M124 146h50M246 129h15M246 143h15M292 129h30M292 143h20" />
          <path className="sketchStroke sketchArrow" d="M120 65c45-34 107-34 154 0M264 65l-10-2M264 65l-4 10" />
        </> : null}
        <path className="sketchStroke sketchStroke--thin sketchUnderline" d="M86 248c48 6 105-7 167-1 47 5 77 2 106-4" />
      </svg>
      <span className="sketchAnnotation">observe → verify → update</span>
    </div>
  );
}

export function getSketchVariant(industry?: string | null): SketchVariant {
  const value = industry ?? "";
  if (/電池|BBU|電源|battery|power/i.test(value)) return "battery";
  if (/光|半導體|compound|optical|laser/i.test(value)) return "optical";
  return "generic";
}

export function getIndustryLabel(industry?: string | null): string {
  const value = industry ?? "Research";
  if (/電池|BBU|電源|battery|power/i.test(value)) return "BBU / AI Infrastructure";
  if (/光|半導體|compound|optical|laser/i.test(value)) return "Optical / Semiconductor";
  if (/銅箔|PCB|CCL|HVLP|copper foil/i.test(value)) return "PCB / CCL · 高階銅箔";
  if (/信任科技|防詐|trusttech|anti.scam/i.test(value)) return "TrustTech / Anti-Scam";
  return value;
}

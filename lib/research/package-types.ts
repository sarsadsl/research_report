export type EvidenceClass = "official" | "third_party_fact" | "market_consensus" | "research_inference";
export type Confidence = "high" | "medium" | "low";
export type SignalStatus = "green" | "yellow" | "red";
export type ReportStatus = "draft" | "review" | "published" | "archived";
export type MoneyScale = "unit" | "thousand" | "million" | "billion";

export interface Provenance {
  evidenceClass: EvidenceClass;
  sourceIds: string[];
  claimIds?: string[];
}

export interface ResearchManifest {
  schemaVersion: "1.0.0";
  ticker: string;
  market: string;
  slug: string;
  reportVersion: string;
  output: { dashboard: boolean; fullReport: boolean; standalone: boolean };
  quality: {
    checkOverflow: boolean;
    checkOverlap: boolean;
    checkSources: boolean;
    desktopTest: boolean;
    mobileTest: boolean;
    offlineStandaloneTest: boolean;
  };
}

export interface ResearchSource {
  id: string;
  evidenceClass: EvidenceClass;
  provider: string;
  title: string;
  url?: string;
  attachment?: string;
  publishedDate?: string;
  accessedDate: string;
  coveredPeriods: string[];
  confidence: Confidence;
  notes?: string;
}

export interface ResearchClaim {
  id: string;
  text: string;
  evidenceClass: EvidenceClass;
  sourceIds: string[];
  inputClaimIds: string[];
  method: string;
  confidence: Confidence;
  notes?: string;
}

export interface ResearchSection {
  id: string;
  type: "summary" | "kpi-grid" | "financial-table" | "bar-chart" | "line-chart" | "bridge" | "scenario-table" | "capacity" | "signals" | "catalysts-risks" | "sources" | "conclusion";
  title: string;
  sortOrder: number;
  payloadRefs: string[];
  showSources: boolean;
}

export interface ResearchPackage {
  schemaVersion: "1.0.0";
  packageVersion: string;
  asOfDate: string;
  company: Record<string, unknown> & { id: string; ticker: string; market: string; name: string; slug: string; currency: string };
  report: Record<string, unknown> & { id: string; title: string; slug: string; status: ReportStatus; version: string };
  thesis: { summary: string; coreChain: string[]; claimIds: string[] };
  actuals: Array<Record<string, unknown> & Provenance>;
  monthlyRevenue: Array<Record<string, unknown> & Provenance>;
  segments: Array<Record<string, unknown> & Provenance>;
  forecasts: Array<Record<string, unknown> & Provenance>;
  capacity: Array<Record<string, unknown> & Provenance>;
  catalysts: Array<Record<string, unknown> & Provenance>;
  risks: Array<Record<string, unknown> & Provenance>;
  signalRules: Array<Record<string, unknown> & Provenance>;
  signalSnapshots: Array<Record<string, unknown> & Provenance>;
  sections: ResearchSection[];
  sources: ResearchSource[];
  claims: ResearchClaim[];
}

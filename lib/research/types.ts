export type SignalStatus = "green" | "yellow" | "red";
export type ForecastScenario = "bear" | "consensus" | "bull";

export type Company = { id:string; ticker:string; market:string; name:string; slug:string; sector?:string|null; industry?:string|null; currency:string; description?:string|null };
export type FinancialActual = { id:string; companyId:string; period:string; fiscalYear:number; quarter?:number|null; revenue?:number|null; grossProfit?:number|null; grossMargin?:number|null; operatingIncome?:number|null; operatingMargin?:number|null; netIncome?:number|null; netMargin?:number|null; eps?:number|null };
export type MonthlyRevenue = { year:number; month:number; revenue:number; mom?:number|null; yoy?:number|null };
export type SegmentRow = { period:string; segment:string; revenue?:number|null; share?:number|null; isEstimate:boolean };
export type Forecast = { fiscalYear:number; scenario:ForecastScenario|string; revenue?:number|null; grossMargin?:number|null; netIncome?:number|null; eps?:number|null; optoShare?:number|null; notes?:string|null };
export type SignalSnapshot = { asOfDate:string; metric:string; status:SignalStatus; valueText?:string|null; notes?:string|null };
export type Report = { id:string; title:string; slug:string; summary?:string|null; thesis?:string|null; status:string; version:string; htmlPath?:string|null; pdfPath?:string|null; publishedAt?:string|null };
export type CapacityEvent = { label:string; equipment:string; technology?:string|null; deltaUnits?:number|null; baseUnits?:number|null; expectedOnlineDate?:string|null; status:string; notes?:string|null };

export type DashboardConfig = {
  currentView:string;
  verificationChain:string[];
  conclusion:string;
  forecastScenario:string;
  headlineForecastYears:number[];
  focusMetric:{ field:"revenue"|"grossMargin"|"netIncome"|"eps"|"optoShare"; label:string };
  monthlyRevenue:{ focusYear:number; cumulativeThroughMonth:number; unitDivisor:number; unitLabel:string };
  cagrCards:Array<{ field:"revenue"|"grossMargin"|"netIncome"|"eps"|"optoShare"; label:string; baseYear:number; targetYear:number; baseValue:number; years:number }>;
  estimateNote:string;
};

export type ResearchDetail = {
  company:Company; dashboard:DashboardConfig; actuals:FinancialActual[]; monthlyRevenue:MonthlyRevenue[];
  segments:SegmentRow[]; forecasts:Forecast[]; signals:SignalSnapshot[]; capacity:CapacityEvent[];
  catalysts:{title:string;impact:string;status:string;notes?:string|null}[];
  risks:{title:string;impact:string;probability:string;status:string;notes?:string|null}[]; reports:Report[];
};
export type ResearchListItem = { company:Company; report:Report; latestActual?:FinancialActual; headlineForecast?:Forecast; signals:SignalSnapshot[] };
export interface ResearchRepository { listPublishedCompanies():Promise<ResearchListItem[]>; getBySlug(slug:string):Promise<ResearchDetail|null> }

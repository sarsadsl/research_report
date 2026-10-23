import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, desc, eq } from "drizzle-orm";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "@/db/research-schema";
import { gogolookSeed, jinguSeed, stlSeed, vpecSeed } from "./seed";
import { latestActual } from "./calculations";
import type { DashboardConfig, ResearchDetail, ResearchListItem, ResearchRepository, SignalStatus } from "./types";

function parseDashboardConfig(value: string | null | undefined): DashboardConfig | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as DashboardConfig;
    return parsed && Array.isArray(parsed.headlineForecastYears) && parsed.monthlyRevenue ? parsed : null;
  } catch { return null; }
}

function createSeedRepository(): ResearchRepository {
  const seeds = [vpecSeed, stlSeed, jinguSeed, gogolookSeed];
  return {
    async listPublishedCompanies() {
      return seeds.flatMap((seed) => {
        const report = seed.reports.find((item) => item.status === "published");
        if (!report) return [];
        const year=Math.max(...seed.dashboard.headlineForecastYears);
        return [{ company:seed.company, report, latestActual:latestActual(seed.actuals),
          headlineForecast:seed.forecasts.find((item)=>item.fiscalYear===year&&item.scenario===seed.dashboard.forecastScenario), signals:seed.signals }];
      });
    },
    async getBySlug(slug) { return seeds.find((seed) => seed.company.slug === slug) ?? null; },
  };
}

function createD1Repository(db: DrizzleD1Database<typeof schema>): ResearchRepository {
  return {
    async listPublishedCompanies() {
      const companies = await db.select().from(schema.researchCompanies).where(eq(schema.researchCompanies.status,"active"));
      const results: ResearchListItem[]=[];
      for (const company of companies) {
        const reports=await db.select().from(schema.researchReports).where(and(eq(schema.researchReports.companyId,company.id),eq(schema.researchReports.status,"published"))).orderBy(desc(schema.researchReports.publishedAt));
        if(!reports[0]) continue;
        const actuals=await db.select().from(schema.researchFinancialActuals).where(eq(schema.researchFinancialActuals.companyId,company.id)).orderBy(desc(schema.researchFinancialActuals.period));
        const dashboardRows=await db.select().from(schema.researchReportSections).where(and(eq(schema.researchReportSections.reportId,reports[0].id),eq(schema.researchReportSections.sectionKey,"dashboard-config"))).limit(1);
        const dashboard=parseDashboardConfig(dashboardRows[0]?.contentJson);
        if(!dashboard)throw new Error(`Missing dashboard-config for published report ${reports[0].id}`);
        const headlineYear=Math.max(...dashboard.headlineForecastYears);
        const forecasts=await db.select().from(schema.researchForecasts).where(and(eq(schema.researchForecasts.companyId,company.id),eq(schema.researchForecasts.fiscalYear,headlineYear),eq(schema.researchForecasts.scenario,dashboard.forecastScenario)));
        const dates=await db.select({asOfDate:schema.researchSignalSnapshots.asOfDate}).from(schema.researchSignalSnapshots).where(eq(schema.researchSignalSnapshots.companyId,company.id)).orderBy(desc(schema.researchSignalSnapshots.asOfDate)).limit(1);
        const signals=dates[0]?await db.select().from(schema.researchSignalSnapshots).where(and(eq(schema.researchSignalSnapshots.companyId,company.id),eq(schema.researchSignalSnapshots.asOfDate,dates[0].asOfDate))):[];
        results.push({company,report:reports[0],latestActual:actuals[0],headlineForecast:forecasts[0],signals:signals.map(s=>({...s,status:s.status as SignalStatus}))});
      }
      return results;
    },
    async getBySlug(slug) {
      const company=(await db.select().from(schema.researchCompanies).where(eq(schema.researchCompanies.slug,slug)).limit(1))[0];
      if(!company) return null;
      const [actuals,monthlyRevenue,segments,forecasts,capacity,catalysts,risks,reports]=await Promise.all([
        db.select().from(schema.researchFinancialActuals).where(eq(schema.researchFinancialActuals.companyId,company.id)).orderBy(schema.researchFinancialActuals.period),
        db.select().from(schema.researchMonthlyRevenue).where(eq(schema.researchMonthlyRevenue.companyId,company.id)).orderBy(schema.researchMonthlyRevenue.year,schema.researchMonthlyRevenue.month),
        db.select().from(schema.researchSegments).where(eq(schema.researchSegments.companyId,company.id)).orderBy(schema.researchSegments.period),
        db.select().from(schema.researchForecasts).where(eq(schema.researchForecasts.companyId,company.id)).orderBy(schema.researchForecasts.fiscalYear),
        db.select().from(schema.researchCapacityEvents).where(eq(schema.researchCapacityEvents.companyId,company.id)),
        db.select().from(schema.researchCatalysts).where(eq(schema.researchCatalysts.companyId,company.id)),
        db.select().from(schema.researchRisks).where(eq(schema.researchRisks.companyId,company.id)),
        db.select().from(schema.researchReports).where(and(eq(schema.researchReports.companyId,company.id),eq(schema.researchReports.status,"published"))).orderBy(desc(schema.researchReports.publishedAt)),
      ]);
      if(!reports[0]) return null;
      const [dates,dashboardRows]=await Promise.all([
        db.select({asOfDate:schema.researchSignalSnapshots.asOfDate}).from(schema.researchSignalSnapshots).where(eq(schema.researchSignalSnapshots.companyId,company.id)).orderBy(desc(schema.researchSignalSnapshots.asOfDate)).limit(1),
        db.select().from(schema.researchReportSections).where(and(eq(schema.researchReportSections.reportId,reports[0].id),eq(schema.researchReportSections.sectionKey,"dashboard-config"))).limit(1),
      ]);
      const dashboard=parseDashboardConfig(dashboardRows[0]?.contentJson);
      if(!dashboard) throw new Error(`Missing dashboard-config for published report ${reports[0].id}`);
      const signalRows=dates[0]?await db.select().from(schema.researchSignalSnapshots).where(and(eq(schema.researchSignalSnapshots.companyId,company.id),eq(schema.researchSignalSnapshots.asOfDate,dates[0].asOfDate))):[];
      const detail:ResearchDetail={company,dashboard,actuals,monthlyRevenue,segments,forecasts,signals:signalRows.map(s=>({...s,status:s.status as SignalStatus})),capacity,catalysts,risks,reports};
      return detail;
    },
  };
}

export async function getResearchRepository():Promise<ResearchRepository>{
  try { const {env}=await getCloudflareContext({async:true}); if(env.RESEARCH_DB)return createD1Repository(drizzle(env.RESEARCH_DB,{schema})); }
  catch { /* next dev has no Worker bindings */ }
  return createSeedRepository();
}

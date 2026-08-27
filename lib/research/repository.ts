import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, desc, eq } from "drizzle-orm";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "@/db/research-schema";
import { vpecSeed } from "./seed";
import { latestActual } from "./calculations";
import type { ResearchDetail, ResearchListItem, ResearchRepository, SignalStatus } from "./types";

function createSeedRepository(): ResearchRepository {
  return {
    async listPublishedCompanies() {
      const report = vpecSeed.reports.find((item) => item.status === "published")!;
      return [{
        company: vpecSeed.company,
        report,
        latestActual: latestActual(vpecSeed.actuals),
        consensus2027: vpecSeed.forecasts.find((item) => item.fiscalYear === 2027 && item.scenario === "consensus"),
        signals: vpecSeed.signals,
      }];
    },
    async getBySlug(slug) {
      return slug === vpecSeed.company.slug ? vpecSeed : null;
    },
  };
}

function createD1Repository(db: DrizzleD1Database<typeof schema>): ResearchRepository {
  return {
    async listPublishedCompanies() {
      const companies = await db.select().from(schema.researchCompanies).where(eq(schema.researchCompanies.status, "active"));
      const results: ResearchListItem[] = [];
      for (const company of companies) {
        const reports = await db.select().from(schema.researchReports)
          .where(and(eq(schema.researchReports.companyId, company.id), eq(schema.researchReports.status, "published")))
          .orderBy(desc(schema.researchReports.publishedAt));
        if (!reports[0]) continue;
        const actuals = await db.select().from(schema.researchFinancialActuals)
          .where(eq(schema.researchFinancialActuals.companyId, company.id))
          .orderBy(desc(schema.researchFinancialActuals.period));
        const forecasts = await db.select().from(schema.researchForecasts)
          .where(and(eq(schema.researchForecasts.companyId, company.id), eq(schema.researchForecasts.fiscalYear, 2027), eq(schema.researchForecasts.scenario, "consensus")));
        const latestDateRows = await db.select({ asOfDate: schema.researchSignalSnapshots.asOfDate })
          .from(schema.researchSignalSnapshots)
          .where(eq(schema.researchSignalSnapshots.companyId, company.id))
          .orderBy(desc(schema.researchSignalSnapshots.asOfDate)).limit(1);
        const signals = latestDateRows[0]
          ? await db.select().from(schema.researchSignalSnapshots).where(and(eq(schema.researchSignalSnapshots.companyId, company.id), eq(schema.researchSignalSnapshots.asOfDate, latestDateRows[0].asOfDate)))
          : [];
        results.push({
          company,
          report: reports[0],
          latestActual: actuals[0],
          consensus2027: forecasts[0],
          signals: signals.map((signal) => ({ ...signal, status: signal.status as SignalStatus })),
        });
      }
      return results;
    },
    async getBySlug(slug) {
      const companies = await db.select().from(schema.researchCompanies).where(eq(schema.researchCompanies.slug, slug)).limit(1);
      const company = companies[0];
      if (!company) return null;
      const [actuals, monthlyRevenue, segments, forecasts, capacity, catalysts, risks, reports] = await Promise.all([
        db.select().from(schema.researchFinancialActuals).where(eq(schema.researchFinancialActuals.companyId, company.id)).orderBy(schema.researchFinancialActuals.period),
        db.select().from(schema.researchMonthlyRevenue).where(eq(schema.researchMonthlyRevenue.companyId, company.id)).orderBy(schema.researchMonthlyRevenue.year, schema.researchMonthlyRevenue.month),
        db.select().from(schema.researchSegments).where(eq(schema.researchSegments.companyId, company.id)).orderBy(schema.researchSegments.period),
        db.select().from(schema.researchForecasts).where(eq(schema.researchForecasts.companyId, company.id)).orderBy(schema.researchForecasts.fiscalYear),
        db.select().from(schema.researchCapacityEvents).where(eq(schema.researchCapacityEvents.companyId, company.id)),
        db.select().from(schema.researchCatalysts).where(eq(schema.researchCatalysts.companyId, company.id)),
        db.select().from(schema.researchRisks).where(eq(schema.researchRisks.companyId, company.id)),
        db.select().from(schema.researchReports).where(and(eq(schema.researchReports.companyId, company.id), eq(schema.researchReports.status, "published"))).orderBy(desc(schema.researchReports.publishedAt)),
      ]);
      const latestDateRows = await db.select({ asOfDate: schema.researchSignalSnapshots.asOfDate })
        .from(schema.researchSignalSnapshots).where(eq(schema.researchSignalSnapshots.companyId, company.id))
        .orderBy(desc(schema.researchSignalSnapshots.asOfDate)).limit(1);
      const signalRows = latestDateRows[0]
        ? await db.select().from(schema.researchSignalSnapshots).where(and(eq(schema.researchSignalSnapshots.companyId, company.id), eq(schema.researchSignalSnapshots.asOfDate, latestDateRows[0].asOfDate)))
        : [];
      const detail: ResearchDetail = {
        company,
        actuals,
        monthlyRevenue,
        segments,
        forecasts,
        signals: signalRows.map((signal) => ({ ...signal, status: signal.status as SignalStatus })),
        capacity,
        catalysts,
        risks,
        reports,
      };
      return detail;
    },
  };
}

export async function getResearchRepository(): Promise<ResearchRepository> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (env.RESEARCH_DB) return createD1Repository(drizzle(env.RESEARCH_DB, { schema }));
  } catch {
    // Standard `next dev` has no Worker bindings. Seed data keeps P0 usable.
  }
  return createSeedRepository();
}

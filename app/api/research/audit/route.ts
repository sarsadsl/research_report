import { getCloudflareContext } from "@opennextjs/cloudflare";
import { AUDIT_COUNTS_SQL, buildAuditSummary, verifyAuditBearer } from "@/lib/research/audit-core.mjs";

export const dynamic = "force-dynamic";

type AuditDB = {
  prepare(sql: string): {
    all(): Promise<{ results: Array<Record<string, any>> }>;
  };
};

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "Vary": "Authorization",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

function respond(body: unknown, status = 200) {
  return Response.json(body, { status, headers });
}

// Never use getResearchRepository(): its seed fallback would look like real D1 data.
export async function GET(request: Request) {
  let db: AuditDB | undefined;
  let secret: string | undefined;
  try {
    const { env } = await getCloudflareContext({ async: true });
    const vars = env as unknown as { RESEARCH_DB?: AuditDB; RESEARCH_AUDIT_TOKEN?: string };
    db = vars.RESEARCH_DB;
    secret = vars.RESEARCH_AUDIT_TOKEN;
  } catch {
    return respond({ error: "audit_not_configured" }, 503);
  }

  // Fail closed when the secret is missing or too weak. No demo data or open mode.
  if (!secret || secret.length < 32 || secret.length > 512) {
    return respond({ error: "audit_not_configured" }, 503);
  }
  if (!await verifyAuditBearer(secret, request.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, {
      status: 401, headers: { ...headers, "WWW-Authenticate": 'Bearer realm="research-audit"' },
    });
  }
  if (!db) return respond({ error: "d1_binding_unavailable" }, 503);

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  if (slug !== null && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return respond({ error: "invalid_slug" }, 400);
  }

  try {
    const [companies, reports, runs, counts, sections, earnings] = await Promise.all([
      db.prepare("SELECT id, slug, ticker, market, name, status FROM research_companies ORDER BY ticker, slug").all(),
      db.prepare("SELECT id, company_id, version, status, updated_at, published_at, html_path FROM research_reports ORDER BY updated_at DESC, id DESC").all(),
      db.prepare("SELECT id, company_id, as_of_date, research_version, status, package_hash, source_hash, seed_hash, report_hash, row_counts_json, imported_at FROM research_runs ORDER BY imported_at DESC, id DESC").all(),
      db.prepare(AUDIT_COUNTS_SQL).all(),
      db.prepare("SELECT report_id, COUNT(*) AS total FROM research_report_sections GROUP BY report_id").all(),
      db.prepare("SELECT report_id, COUNT(*) AS total FROM research_earnings_quality GROUP BY report_id").all(),
    ]);
    const data = buildAuditSummary({
      companies: companies.results, reports: reports.results, runs: runs.results,
      counts: counts.results, sections: sections.results, earnings: earnings.results,
    }, slug);
    if (slug !== null && data.length === 0) return respond({ error: "company_not_found" }, 404);
    return respond({
      source: "cloudflare-d1",
      generatedAt: new Date().toISOString(),
      scope: slug ?? "all",
      companyCount: data.length,
      reviewRequired: data.filter(row => row.status !== "METADATA_MATCH").length,
      limitations: [
        "Import run records and counts do not prove field-level accuracy or manual QC.",
        "reportHash is the HTML hash recorded during import, not a live website hash.",
        "Prior report versions can affect research_reports row-count comparisons.",
      ],
      companies: data,
    });
  } catch {
    // Do not disclose SQL errors, identifiers, credentials or connection details.
    return respond({ error: "audit_query_failed" }, 503);
  }
}

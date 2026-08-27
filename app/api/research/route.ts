import { getResearchRepository } from "@/lib/research/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const repo = await getResearchRepository();
  return Response.json(await repo.listPublishedCompanies());
}

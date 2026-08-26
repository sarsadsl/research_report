import { getResearchRepository } from "@/lib/research/repository";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repo = await getResearchRepository();
  const data = await repo.getBySlug(slug);
  if (!data) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(data);
}

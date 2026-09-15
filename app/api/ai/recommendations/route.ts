import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateRecommendations } from "@/lib/ai/generate";
import { getContentBundle } from "@/lib/composio/aggregate";
import { parseRangeFromSearchParams } from "@/lib/date-range";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const brandId = url.searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ error: "brandId is required." }, { status: 400 });

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand) return NextResponse.json({ error: "Brand not found." }, { status: 404 });

  const { range } = parseRangeFromSearchParams({ range: "90d" });
  const contentBundle = await getContentBundle(range);

  const history = Object.values(contentBundle)
    .filter((r) => r.ok)
    .flatMap((r) => (r.ok ? r.data : []))
    .map((post) => ({
      platform: post.platform,
      format: post.format,
      caption: post.caption ?? "",
      hook: (post.caption ?? "").split("\n")[0] ?? "",
      publishedAt: post.publishedAt,
      reach: post.metrics.reach,
      saveRate: post.saveRate,
      shareRate: post.shareRate,
    }))
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));

  try {
    const result = await generateRecommendations(brand, history);
    return NextResponse.json({ ...result, basedOnPosts: history.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Recommendation generation failed." }, { status: 502 });
  }
}

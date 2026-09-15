import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { PlatformValue, PipelineStatusValue, ContentFormatValue } from "@/lib/domain-types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const brandId = url.searchParams.get("brandId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const items = await db.contentItem.findMany({
    where: {
      brandId,
      status: status ? (status as PipelineStatusValue) : undefined,
      scheduledAt: from && to ? { gte: new Date(from), lte: new Date(to) } : undefined,
    },
    include: { campaign: true, brand: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  const { brandId, platform, format } = body;
  if (!brandId || !platform || !format) {
    return NextResponse.json({ error: "brandId, platform and format are required." }, { status: 400 });
  }

  const item = await db.contentItem.create({
    data: {
      brandId: brandId as string,
      campaignId: (body.campaignId as string) ?? null,
      platform: platform as PlatformValue,
      format: format as ContentFormatValue,
      caption: (body.caption as string) ?? "",
      hook: (body.hook as string) ?? "",
      cta: (body.cta as string) ?? "",
      hashtags: JSON.stringify(body.hashtags ?? []),
      mediaUrl: (body.mediaUrl as string) ?? null,
      status: (body.status as PipelineStatusValue) ?? "IDEA",
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt as string) : null,
      notes: (body.notes as string) ?? "",
    },
  });
  return NextResponse.json({ item }, { status: 201 });
}

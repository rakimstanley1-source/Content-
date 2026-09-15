import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { repurposeForPlatform } from "@/lib/ai/generate";
import type { PlatformValue } from "@/lib/domain-types";

export async function POST(req: Request) {
  const body = await req.json();
  const { contentItemId, targetPlatform, targetFormat } = body as {
    contentItemId?: string;
    targetPlatform?: PlatformValue;
    targetFormat?: string;
  };

  if (!contentItemId || !targetPlatform) {
    return NextResponse.json({ error: "contentItemId and targetPlatform are required." }, { status: 400 });
  }

  const source = await db.contentItem.findUnique({ where: { id: contentItemId }, include: { brand: true } });
  if (!source) {
    return NextResponse.json({ error: "Source content not found." }, { status: 404 });
  }

  try {
    const variation = await repurposeForPlatform(
      source.brand,
      { platform: source.platform, format: source.format, caption: source.caption, hook: source.hook },
      targetPlatform
    );

    const created = await db.contentItem.create({
      data: {
        brandId: source.brandId,
        campaignId: source.campaignId,
        platform: targetPlatform,
        format: targetFormat ?? "OTHER",
        caption: variation.caption,
        hook: variation.hook,
        cta: variation.cta,
        hashtags: JSON.stringify(variation.hashtags),
        status: "IDEA",
        notes: variation.formatNotes,
        repurposedFromId: source.id,
      },
    });

    return NextResponse.json({ created });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Repurposing failed." }, { status: 502 });
  }
}

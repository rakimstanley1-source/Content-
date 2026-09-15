import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publishContent } from "@/lib/composio/publish";
import { ComposioSourceError } from "@/lib/composio/errors";
import { runAutomationsForTrigger } from "@/lib/automations/run";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const item = await db.contentItem.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const platformKey = item.platform.toLowerCase() as "instagram" | "tiktok" | "youtube" | "pinterest" | "twitter";
    const result = await publishContent({
      platform: platformKey,
      format: item.format.toLowerCase(),
      caption: item.caption,
      mediaUrl: item.mediaUrl,
    });

    const updated = await db.contentItem.update({
      where: { id: item.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        externalPostId: result.externalPostId,
        externalPermalink: result.externalPermalink,
      },
    });

    await runAutomationsForTrigger("content_published", { brandId: updated.brandId, contentItemId: updated.id });

    return NextResponse.json({ item: updated });
  } catch (err) {
    if (err instanceof ComposioSourceError) {
      return NextResponse.json({ error: err.message, reason: err.kind }, { status: 422 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Publish failed." }, { status: 500 });
  }
}

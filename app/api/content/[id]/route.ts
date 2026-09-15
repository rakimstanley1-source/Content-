import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const item = await db.contentItem.findUnique({ where: { id: params.id }, include: { brand: true, campaign: true } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = { ...body };
  if ("hashtags" in data) data.hashtags = JSON.stringify(data.hashtags);
  if ("scheduledAt" in data && data.scheduledAt) data.scheduledAt = new Date(data.scheduledAt as string);
  if ("publishedAt" in data && data.publishedAt) data.publishedAt = new Date(data.publishedAt as string);

  const item = await db.contentItem.update({ where: { id: params.id }, data });
  return NextResponse.json({ item });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await db.contentItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

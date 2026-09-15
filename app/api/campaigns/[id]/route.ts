import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = { ...body };
  if ("startDate" in data && data.startDate) data.startDate = new Date(data.startDate as string);
  if ("endDate" in data && data.endDate) data.endDate = new Date(data.endDate as string);
  const campaign = await db.campaign.update({ where: { id: params.id }, data });
  return NextResponse.json({ campaign });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await db.campaign.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

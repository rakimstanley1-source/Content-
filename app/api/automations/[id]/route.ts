import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = { ...body };
  if ("trigger" in data) data.trigger = JSON.stringify(data.trigger);
  if ("steps" in data) data.steps = JSON.stringify(data.steps);
  const automation = await db.automation.update({ where: { id: params.id }, data });
  return NextResponse.json({ automation });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await db.automation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

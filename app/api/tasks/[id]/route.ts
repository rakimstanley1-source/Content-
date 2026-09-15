import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json()) as Record<string, unknown>;
  const task = await db.taskItem.update({ where: { id: params.id }, data: body });
  return NextResponse.json({ task });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await db.taskItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

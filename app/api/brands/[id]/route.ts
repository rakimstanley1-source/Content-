import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const brand = await db.brand.findUnique({ where: { id: params.id } });
  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ brand });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = { ...body };
  for (const arrayField of ["colorPalette", "contentPillars", "platforms"]) {
    if (arrayField in data) data[arrayField] = JSON.stringify(data[arrayField]);
  }
  const brand = await db.brand.update({ where: { id: params.id }, data });
  return NextResponse.json({ brand });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await db.brand.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

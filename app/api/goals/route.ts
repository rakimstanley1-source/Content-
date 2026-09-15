import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const brandId = url.searchParams.get("brandId") ?? undefined;
  const goals = await db.goal.findMany({ where: { brandId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ goals });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.brandId || !body.metric || !body.target) {
    return NextResponse.json({ error: "brandId, metric and target are required." }, { status: 400 });
  }
  const goal = await db.goal.create({
    data: {
      brandId: body.brandId as string,
      metric: body.metric as string,
      label: (body.label as string) ?? (body.metric as string),
      target: Number(body.target),
      period: (body.period as string) ?? "weekly",
    },
  });
  return NextResponse.json({ goal }, { status: 201 });
}

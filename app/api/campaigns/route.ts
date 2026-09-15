import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const brandId = url.searchParams.get("brandId") ?? undefined;
  const campaigns = await db.campaign.findMany({
    where: { brandId },
    include: { contentItems: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.brandId || !body.name) {
    return NextResponse.json({ error: "brandId and name are required." }, { status: 400 });
  }
  const campaign = await db.campaign.create({
    data: {
      brandId: body.brandId as string,
      name: body.name as string,
      description: (body.description as string) ?? "",
      goal: (body.goal as string) ?? "",
      status: (body.status as string) ?? "planned",
      startDate: body.startDate ? new Date(body.startDate as string) : null,
      endDate: body.endDate ? new Date(body.endDate as string) : null,
    },
  });
  return NextResponse.json({ campaign }, { status: 201 });
}

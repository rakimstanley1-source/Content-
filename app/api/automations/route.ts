import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const brandId = url.searchParams.get("brandId") ?? undefined;
  const automations = await db.automation.findMany({
    where: { brandId },
    include: { runs: { orderBy: { startedAt: "desc" }, take: 5 } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ automations });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.name || !body.trigger || !body.steps) {
    return NextResponse.json({ error: "name, trigger and steps are required." }, { status: 400 });
  }
  const automation = await db.automation.create({
    data: {
      brandId: (body.brandId as string) ?? null,
      name: body.name as string,
      description: (body.description as string) ?? "",
      trigger: JSON.stringify(body.trigger),
      steps: JSON.stringify(body.steps),
      enabled: body.enabled !== false,
    },
  });
  return NextResponse.json({ automation }, { status: 201 });
}

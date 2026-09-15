import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const brandId = url.searchParams.get("brandId") ?? undefined;
  const tasks = await db.taskItem.findMany({
    where: { brandId },
    include: { contentItem: true },
    orderBy: [{ done: "asc" }, { dueAt: "asc" }],
  });
  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.brandId || !body.title) {
    return NextResponse.json({ error: "brandId and title are required." }, { status: 400 });
  }
  const task = await db.taskItem.create({
    data: {
      brandId: body.brandId as string,
      contentItemId: (body.contentItemId as string) ?? null,
      title: body.title as string,
      dueAt: body.dueAt ? new Date(body.dueAt as string) : null,
    },
  });
  return NextResponse.json({ task }, { status: 201 });
}

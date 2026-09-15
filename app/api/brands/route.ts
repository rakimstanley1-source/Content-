import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const brands = await db.brand.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ brands });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, ...rest } = body as Record<string, unknown>;
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const brand = await db.brand.create({
    data: {
      name,
      slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
      identity: (rest.identity as string) ?? "",
      audience: (rest.audience as string) ?? "",
      voice: (rest.voice as string) ?? "",
      products: (rest.products as string) ?? "",
      colorPalette: JSON.stringify(rest.colorPalette ?? []),
      visualAesthetic: (rest.visualAesthetic as string) ?? "",
      contentPillars: JSON.stringify(rest.contentPillars ?? []),
      platforms: JSON.stringify(rest.platforms ?? []),
      aiInstructions: (rest.aiInstructions as string) ?? "",
    },
  });
  return NextResponse.json({ brand }, { status: 201 });
}

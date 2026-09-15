import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateForBrand, type GenerateKind } from "@/lib/ai/generate";

export async function POST(req: Request) {
  const body = await req.json();
  const { brandId, kind, idea } = body as { brandId?: string; kind?: GenerateKind; idea?: string };

  if (!brandId || !kind || !idea) {
    return NextResponse.json({ error: "brandId, kind and idea are required." }, { status: 400 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand) {
    return NextResponse.json({ error: "Brand not found." }, { status: 404 });
  }

  try {
    const result = await generateForBrand(brand, kind, idea);
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Generation failed." }, { status: 502 });
  }
}

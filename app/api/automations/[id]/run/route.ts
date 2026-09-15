import { NextResponse } from "next/server";
import { runAutomation } from "@/lib/automations/run";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const result = await runAutomation(params.id, { contentItemId: body.contentItemId, brandId: body.brandId });
  return NextResponse.json(result);
}

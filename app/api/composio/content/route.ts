import { NextResponse, type NextRequest } from "next/server";
import { getContentBundle } from "@/lib/composio/aggregate";
import { rangeFromRequest } from "@/lib/api-range";

export async function GET(req: NextRequest) {
  const { range } = rangeFromRequest(req);
  const bundle = await getContentBundle(range);
  return NextResponse.json(bundle);
}

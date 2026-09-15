import { NextResponse, type NextRequest } from "next/server";
import { getOverviewBundle } from "@/lib/composio/aggregate";
import { rangeFromRequest } from "@/lib/api-range";

export async function GET(req: NextRequest) {
  const { range } = rangeFromRequest(req);
  const bundle = await getOverviewBundle(range);
  return NextResponse.json(bundle);
}

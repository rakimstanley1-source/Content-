import type { NextRequest } from "next/server";
import { parseRangeFromSearchParams } from "@/lib/date-range";

export function rangeFromRequest(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  return parseRangeFromSearchParams(params);
}

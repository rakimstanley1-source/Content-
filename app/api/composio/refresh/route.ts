import { NextResponse } from "next/server";
import { invalidate } from "@/lib/composio/cache";

/** Manual refresh button: drops every cached Composio response so the next
 * read hits the live APIs instead of the 15-minute cache. */
export async function POST() {
  invalidate("overview");
  invalidate("content");
  invalidate("email");
  return NextResponse.json({ ok: true, refreshedAt: Date.now() });
}

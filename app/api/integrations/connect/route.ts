import { NextResponse } from "next/server";
import { initiateConnection } from "@/lib/composio/client";

export async function POST(req: Request) {
  const { toolkit } = (await req.json()) as { toolkit?: string };
  if (!toolkit) return NextResponse.json({ error: "toolkit is required." }, { status: 400 });

  try {
    const { redirectUrl } = await initiateConnection(toolkit);
    if (!redirectUrl) return NextResponse.json({ error: "Composio didn't return a connect URL for this toolkit." }, { status: 502 });
    return NextResponse.json({ redirectUrl });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to start connection." }, { status: 500 });
  }
}

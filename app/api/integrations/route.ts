import { NextResponse } from "next/server";
import { getToolkitConnections } from "@/lib/composio/client";
import { TOOLKIT_CATALOG } from "@/lib/composio/registry";

export async function GET() {
  const results = await Promise.all(
    TOOLKIT_CATALOG.map(async (entry) => {
      const accounts = await getToolkitConnections(entry.toolkit).catch(() => []);
      return {
        ...entry,
        connected: accounts.some((a) => a.status === "ACTIVE"),
        accounts,
      };
    })
  );
  return NextResponse.json({ integrations: results });
}

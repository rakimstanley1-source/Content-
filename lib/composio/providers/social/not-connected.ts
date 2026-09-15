import { getToolkitConnections } from "@/lib/composio/client";
import { ComposioSourceError } from "@/lib/composio/errors";

export async function resolveAccountId(toolkit: string, envVarValue: string | undefined): Promise<string> {
  if (envVarValue) return envVarValue;
  const accounts = await getToolkitConnections(toolkit);
  const active = accounts.filter((a) => a.status === "ACTIVE");
  if (active.length === 0) {
    throw new ComposioSourceError(`No active ${toolkit} connection in Composio.`, { toolkit, kind: "not_connected" });
  }
  return (active.find((a) => a.isDefault) ?? active[0]).id;
}

export async function isToolkitConnected(toolkit: string): Promise<boolean> {
  const accounts = await getToolkitConnections(toolkit);
  return accounts.some((a) => a.status === "ACTIVE");
}

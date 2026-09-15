import { Composio } from "composio-core";
import { withBackoff } from "./backoff";
import { ComposioSourceError } from "./errors";

let client: Composio | null = null;

function getClient(): Composio {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new ComposioSourceError("COMPOSIO_API_KEY is not set on the server.", {
      toolkit: "composio",
      kind: "config_missing",
    });
  }
  if (!client) {
    client = new Composio({ apiKey });
  }
  return client;
}

/**
 * Executes a single Composio action by its real toolkit action slug
 * (e.g. "INSTAGRAM_GET_IG_USER_MEDIA"). Slugs and params must come from
 * Composio's own tool catalog — never invented ad hoc.
 */
export async function executeComposioAction<T = Record<string, unknown>>(args: {
  toolkit: string;
  actionName: string;
  params?: Record<string, unknown>;
  connectedAccountId?: string;
}): Promise<T> {
  const entity = getClient().getEntity(process.env.COMPOSIO_ENTITY_ID ?? "default");

  const result = await withBackoff(() =>
    entity.execute({
      actionName: args.actionName,
      params: args.params,
      connectedAccountId: args.connectedAccountId,
    })
  ).catch((err) => {
    throw new ComposioSourceError(err instanceof Error ? err.message : "Composio request failed", {
      toolkit: args.toolkit,
      kind: "action_failed",
    });
  });

  if (!result.successful) {
    throw new ComposioSourceError(result.error ?? `${args.actionName} failed`, {
      toolkit: args.toolkit,
      kind: "action_failed",
    });
  }

  return result.data as T;
}

/** Starts a Composio OAuth connection for a toolkit and returns the URL the
 * operator visits to grant access — the "explicit connect action" the
 * Integrations screen's empty states point to. */
export async function initiateConnection(toolkitSlug: string): Promise<{ redirectUrl: string | null; connectedAccountId: string }> {
  const client = getClient();
  const request = await client.connectedAccounts.initiate({
    appName: toolkitSlug,
    entityId: process.env.COMPOSIO_ENTITY_ID ?? "default",
  });
  return { redirectUrl: request.redirectUrl, connectedAccountId: request.connectedAccountId };
}

export type ConnectedAccount = {
  id: string;
  status: string;
  isDefault: boolean;
  alias?: string;
  username?: string;
};

/** Live connection status for a toolkit — powers the Integrations screen. */
export async function getToolkitConnections(toolkitSlug: string): Promise<ConnectedAccount[]> {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) return [];
  const accounts = await getClient().connectedAccounts.list({ appNames: [toolkitSlug] } as never);
  const items = (accounts as { items?: unknown[] }).items ?? (Array.isArray(accounts) ? accounts : []);
  return (items as Array<Record<string, unknown>>).map((a) => ({
    id: String(a.id ?? a.connectionId ?? ""),
    status: String(a.status ?? "UNKNOWN"),
    isDefault: Boolean(a.isDefault),
    alias: typeof a.alias === "string" ? a.alias : undefined,
    username: typeof (a as { clientUniqueUserId?: unknown }).clientUniqueUserId === "string" ? (a as { clientUniqueUserId?: string }).clientUniqueUserId : undefined,
  }));
}

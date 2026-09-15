import { executeComposioAction } from "@/lib/composio/client";
import { ComposioSourceError } from "@/lib/composio/errors";
import type { DailyPoint, EmailProvider, EmailStats } from "@/lib/composio/types";
import type { DateRange } from "@/lib/date-range";
import { isToolkitConnected, resolveAccountId as resolveGenericAccountId } from "../social/not-connected";

const TOOLKIT = "mailerlite";

type Campaign = {
  id: string;
  started_at?: string;
  stats?: { sent?: number; open_rate?: { float?: number }; click_rate?: { float?: number }; unsubscribes_count?: number };
  emails?: Array<{ subject?: string }>;
};

async function resolveAccountId(): Promise<string> {
  return resolveGenericAccountId(TOOLKIT, process.env.COMPOSIO_MAILERLITE_ACCOUNT_ID);
}

async function sentCampaignsInRange(connectedAccountId: string, range: DateRange): Promise<Campaign[]> {
  const result = await executeComposioAction<{ data?: Campaign[] }>({
    toolkit: TOOLKIT,
    actionName: "MAILERLITE_GET_CAMPAIGNS",
    connectedAccountId,
    params: { status: "sent", limit: 100 },
  });
  // MailerLite's campaign list has no since/before filter, so the date
  // range is applied client-side against each campaign's send time.
  return (result.data ?? []).filter((c) => {
    if (!c.started_at) return false;
    const t = new Date(c.started_at).getTime();
    return t >= range.start.getTime() && t <= range.end.getTime();
  });
}

export const mailerliteProvider: EmailProvider = {
  providerId: "mailerlite",
  toolkitSlug: TOOLKIT,

  async isConnected() {
    return isToolkitConnected(TOOLKIT);
  },

  async getEmailStats(range: DateRange): Promise<EmailStats> {
    const connectedAccountId = await resolveAccountId();
    const [account, campaigns] = await Promise.all([
      executeComposioAction<{ subscribed?: number; unsubscribed?: number }>({
        toolkit: TOOLKIT,
        actionName: "MAILERLITE_GET_ACCOUNT_STATS",
        connectedAccountId,
        params: {},
      }),
      sentCampaignsInRange(connectedAccountId, range),
    ]);

    const totalSent = campaigns.reduce((sum, c) => sum + (c.stats?.sent ?? 0), 0);
    const weighted = (pick: (c: Campaign) => number | undefined) =>
      totalSent > 0 ? campaigns.reduce((sum, c) => sum + (pick(c) ?? 0) * (c.stats?.sent ?? 0), 0) / totalSent : null;

    return {
      provider: "mailerlite",
      // MailerLite's exposed actions have no range-filtered subscriber
      // list, so per-period new-subscriber and unsubscribe counts aren't
      // derivable here — shown as a dash rather than guessed.
      newSubscribers: null,
      totalListSize: account.subscribed ?? null,
      openRate: weighted((c) => c.stats?.open_rate?.float),
      clickRate: weighted((c) => c.stats?.click_rate?.float),
      unsubscribes: null,
      subscribersBySource: [],
      sourceBreakdownAvailable: false,
      recentSends: campaigns.map((c) => ({
        id: c.id,
        subject: c.emails?.[0]?.subject ?? "(no subject)",
        sentAt: c.started_at ?? null,
        recipients: c.stats?.sent ?? null,
        openRate: c.stats?.open_rate?.float ?? null,
        clickRate: c.stats?.click_rate?.float ?? null,
      })),
    };
  },

  async getSubscriberGrowth(_range: DateRange): Promise<DailyPoint[]> {
    throw new ComposioSourceError("Composio's mailerlite toolkit doesn't yet expose a subscriber growth-history action.", {
      toolkit: TOOLKIT,
      kind: "action_failed",
    });
  },
};

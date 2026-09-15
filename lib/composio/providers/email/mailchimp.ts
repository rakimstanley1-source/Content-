import { executeComposioAction } from "@/lib/composio/client";
import { ComposioSourceError } from "@/lib/composio/errors";
import type { DailyPoint, EmailProvider, EmailStats } from "@/lib/composio/types";
import type { DateRange } from "@/lib/date-range";
import { eachDay, toISODate } from "@/lib/date-range";
import { isToolkitConnected, resolveAccountId as resolveGenericAccountId } from "../social/not-connected";

const TOOLKIT = "mailchimp";

async function resolveAccountId(): Promise<string> {
  return resolveGenericAccountId(TOOLKIT, process.env.COMPOSIO_MAILCHIMP_ACCOUNT_ID);
}

async function resolveListId(connectedAccountId: string): Promise<string> {
  const explicit = process.env.COMPOSIO_MAILCHIMP_LIST_ID;
  if (explicit) return explicit;
  const lists = await executeComposioAction<{ lists?: Array<{ id?: string }> }>({
    toolkit: TOOLKIT,
    actionName: "MAILCHIMP_GET_LISTS_INFO",
    connectedAccountId,
    params: { count: 1 },
  });
  const listId = lists.lists?.[0]?.id;
  if (!listId) {
    throw new ComposioSourceError("No Mailchimp audience/list found for this account.", { toolkit: TOOLKIT, kind: "action_failed" });
  }
  return listId;
}

type MailchimpMember = { timestamp_opt?: string; last_changed?: string };

/** Mailchimp caps a single page at 1,000 members; two pages covers small-to-
 * mid lists for a 90-day window without over-complicating pagination. */
async function fetchMembersPage(connectedAccountId: string, listId: string, params: Record<string, unknown>): Promise<MailchimpMember[]> {
  const pages = await Promise.all(
    [0, 1000].map((offset) =>
      executeComposioAction<{ members?: MailchimpMember[] }>({
        toolkit: TOOLKIT,
        actionName: "MAILCHIMP_LIST_MEMBERS_INFO",
        connectedAccountId,
        params: { list_id: listId, count: 1000, offset, ...params },
      }).catch(() => ({ members: [] }))
    )
  );
  return pages.flatMap((p) => p.members ?? []);
}

export const mailchimpProvider: EmailProvider = {
  providerId: "mailchimp",
  toolkitSlug: TOOLKIT,

  async isConnected() {
    return isToolkitConnected(TOOLKIT);
  },

  async getEmailStats(range: DateRange): Promise<EmailStats> {
    const connectedAccountId = await resolveAccountId();
    const listId = await resolveListId(connectedAccountId);
    const since = range.start.toISOString();
    const before = range.end.toISOString();

    const [listInfo, newMembers, unsubMembers, campaigns] = await Promise.all([
      executeComposioAction<{ stats?: { member_count?: number } }>({
        toolkit: TOOLKIT,
        actionName: "MAILCHIMP_GET_LIST_INFO",
        connectedAccountId,
        params: { list_id: listId, include_total_contacts: true },
      }),
      fetchMembersPage(connectedAccountId, listId, { since_timestamp_opt: since, before_timestamp_opt: before }),
      fetchMembersPage(connectedAccountId, listId, { status: "unsubscribed", unsubscribed_since: since }),
      executeComposioAction<{
        campaigns?: Array<{
          id?: string;
          settings?: { subject_line?: string };
          send_time?: string;
          emails_sent?: number;
          report_summary?: { open_rate?: number; click_rate?: number };
        }>;
      }>({
        toolkit: TOOLKIT,
        actionName: "MAILCHIMP_LIST_CAMPAIGNS",
        connectedAccountId,
        params: { status: "sent", since_send_time: since, before_send_time: before, count: 50, sort_field: "send_time", sort_dir: "DESC" },
      }),
    ]);

    // unsubscribed_since has no upper bound in Mailchimp's API, so clamp to
    // the range end ourselves using each member's last_changed timestamp.
    const unsubInRange = unsubMembers.filter((m) => {
      if (!m.last_changed) return true;
      const t = new Date(m.last_changed).getTime();
      return t <= range.end.getTime();
    });

    const sentInRange = campaigns.campaigns ?? [];
    const totalRecipients = sentInRange.reduce((sum, c) => sum + (c.emails_sent ?? 0), 0);
    const weightedRate = (pick: (c: (typeof sentInRange)[number]) => number | undefined) =>
      totalRecipients > 0
        ? sentInRange.reduce((sum, c) => sum + (pick(c) ?? 0) * (c.emails_sent ?? 0), 0) / totalRecipients
        : null;

    return {
      provider: "mailchimp",
      newSubscribers: newMembers.length,
      totalListSize: listInfo.stats?.member_count ?? null,
      openRate: weightedRate((c) => c.report_summary?.open_rate),
      clickRate: weightedRate((c) => c.report_summary?.click_rate),
      unsubscribes: unsubInRange.length,
      // Mailchimp's member object has no "signup source" field we can read
      // through these actions (tags/segments are closest, but tagging is
      // an opt-in workflow the brand may not use) — show an honest "not
      // available" instead of guessing a breakdown.
      subscribersBySource: [],
      sourceBreakdownAvailable: false,
      recentSends: sentInRange.map((c) => ({
        id: c.id ?? "",
        subject: c.settings?.subject_line ?? "(no subject)",
        sentAt: c.send_time ?? null,
        recipients: c.emails_sent ?? null,
        openRate: c.report_summary?.open_rate ?? null,
        clickRate: c.report_summary?.click_rate ?? null,
      })),
    };
  },

  async getSubscriberGrowth(range: DateRange): Promise<DailyPoint[]> {
    const connectedAccountId = await resolveAccountId();
    const listId = await resolveListId(connectedAccountId);
    const since = range.start.toISOString();
    const before = range.end.toISOString();

    const [newMembers, unsubMembers] = await Promise.all([
      fetchMembersPage(connectedAccountId, listId, { since_timestamp_opt: since, before_timestamp_opt: before }),
      fetchMembersPage(connectedAccountId, listId, { status: "unsubscribed", unsubscribed_since: since }),
    ]);

    const signupsByDay = new Map<string, number>();
    for (const member of newMembers) {
      if (!member.timestamp_opt) continue;
      const day = toISODate(new Date(member.timestamp_opt));
      signupsByDay.set(day, (signupsByDay.get(day) ?? 0) + 1);
    }
    const unsubsByDay = new Map<string, number>();
    for (const member of unsubMembers) {
      if (!member.last_changed) continue;
      const day = toISODate(new Date(member.last_changed));
      if (new Date(member.last_changed).getTime() > range.end.getTime()) continue;
      unsubsByDay.set(day, (unsubsByDay.get(day) ?? 0) + 1);
    }

    return eachDay(range).map((date) => {
      const day = toISODate(date);
      const net = (signupsByDay.get(day) ?? 0) - (unsubsByDay.get(day) ?? 0);
      return { date: day, value: net };
    });
  },
};

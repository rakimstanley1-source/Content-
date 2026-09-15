import { executeComposioAction } from "@/lib/composio/client";
import type { AccountMetrics, Post, SocialProvider } from "@/lib/composio/types";
import type { DateRange } from "@/lib/date-range";
import { toISODate } from "@/lib/date-range";
import { safeDiv } from "@/lib/utils";
import { isToolkitConnected } from "./not-connected";

const TOOLKIT = "pinterest";

function sumSeries(series: unknown, key: string): number | null {
  const daily = (series as { all?: { daily_metrics?: Array<Record<string, number>> }; summary_metrics?: Record<string, number> })?.summary_metrics;
  if (daily && typeof daily[key] === "number") return daily[key];
  return null;
}

export const pinterestProvider: SocialProvider = {
  platform: "pinterest",
  toolkitSlug: TOOLKIT,

  async isConnected() {
    return isToolkitConnected(TOOLKIT);
  },

  async getPosts(range: DateRange): Promise<Post[]> {
    const pins = await executeComposioAction<{ items?: Array<{ id?: string; title?: string; description?: string; media?: { images?: Record<string, { url?: string }> }; created_at?: string }> }>({
      toolkit: TOOLKIT,
      actionName: "PINTEREST_LIST_PINS",
      params: { page_size: 100, include_metrics: true },
    });

    const items = (pins.items ?? []).filter((pin) => {
      if (!pin.created_at) return true; // Pinterest doesn't always echo created_at; keep rather than drop.
      const t = new Date(pin.created_at).getTime();
      return t >= range.start.getTime() && t <= range.end.getTime();
    });

    const startDate = toISODate(range.start);
    const endDate = toISODate(range.end);

    const posts = await Promise.all(
      items.slice(0, 25).map(async (pin): Promise<Post> => {
        let analytics: unknown = null;
        try {
          analytics = await executeComposioAction({
            toolkit: TOOLKIT,
            actionName: "PINTEREST_GET_PIN_ANALYTICS",
            params: {
              pin_id: pin.id,
              start_date: startDate,
              end_date: endDate,
              metric_types: ["IMPRESSION", "SAVE", "OUTBOUND_CLICK", "TOTAL_COMMENTS", "PROFILE_VISIT"],
            },
          });
        } catch {
          analytics = null;
        }

        const reach = sumSeries(analytics, "IMPRESSION");
        const saves = sumSeries(analytics, "SAVE");

        return {
          id: pin.id ?? "",
          platform: "pinterest",
          permalink: pin.id ? `https://www.pinterest.com/pin/${pin.id}/` : null,
          thumbnailUrl: Object.values(pin.media?.images ?? {})[0]?.url ?? null,
          caption: pin.title ?? pin.description ?? null,
          format: "pin",
          publishedAt: pin.created_at ?? null,
          metrics: {
            reach,
            saves,
            // Pinterest has no "share" concept comparable to Instagram's.
            shares: null,
            comments: sumSeries(analytics, "TOTAL_COMMENTS"),
            likes: null,
            profileVisits: sumSeries(analytics, "PROFILE_VISIT"),
            externalLinkTaps: sumSeries(analytics, "OUTBOUND_CLICK"),
          },
          saveRate: safeDiv(saves, reach),
          shareRate: null,
        };
      })
    );

    return posts;
  },

  async getAccountMetrics(_range: DateRange): Promise<AccountMetrics> {
    // Composio's pinterest toolkit doesn't currently expose an
    // account-level analytics or follower-count action (only per-pin
    // analytics and board/pin listing) — re-check the catalog if Pinterest
    // ships one later.
    return {
      platform: "pinterest",
      followerCount: null,
      followerDelta: null,
      reach: null,
      profileVisits: null,
      externalLinkTaps: null,
    };
  },
};
